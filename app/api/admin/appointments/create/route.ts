import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlots, excludePatientConflicts } from "@/lib/slots";
import { adminCreateAppointmentSchema, isOnBookableGrid, isPastInstant } from "@/lib/validation";
import { addDaysToDateLabel, CLINIC_TZ, DEFAULT_LEAD_TIME_MINUTES } from "@/lib/tz";
import { appointmentReference } from "@/lib/reference";
import { createEvent } from "@/lib/google-calendar";
import { notifyAppointment } from "@/lib/notify";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const parsed = adminCreateAppointmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the appointment details and try again." }, { status: 400 });

  const input = parsed.data;
  const startUtc = new Date(input.startUtc);
  const now = new Date();
  if (isPastInstant(startUtc, now, DEFAULT_LEAD_TIME_MINUTES)) {
    return NextResponse.json({ error: "That time has passed or is inside the clinic lead time." }, { status: 400 });
  }
  if (!isOnBookableGrid(startUtc, CLINIC_TZ)) {
    return NextResponse.json({ error: "That time is outside clinic hours." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: physio, error: physioError } = await admin
    .from("physiotherapists")
    .select("id, full_name, specialisation, email")
    .eq("id", input.physioId)
    .eq("is_active", true)
    .maybeSingle();
  if (physioError || !physio) return NextResponse.json({ error: "Select an active physiotherapist." }, { status: 400 });

  let patientId: string | null = null;
  let patientName: string;
  let patientEmail: string;
  let patientCreated = false;

  if (input.patient.kind === "existing") {
    const { data: patient, error } = await admin
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", input.patient.patientId)
      .eq("role", "patient")
      .maybeSingle();
    if (error || !patient) return NextResponse.json({ error: "Select an existing patient." }, { status: 400 });
    patientId = patient.id;
    patientName = patient.full_name ?? patient.email;
    patientEmail = patient.email;
  } else {
    const { data: duplicates, error: duplicateError } = await admin.rpc("find_admin_patient_duplicates", {
      p_actor_id: auth.user.id,
      p_email: input.patient.email,
      p_phone: input.patient.phone,
    });
    if (duplicateError) return NextResponse.json({ error: "Could not verify patient details." }, { status: 500 });
    if (duplicates?.length) return NextResponse.json({ error: "A patient with this email or phone already exists.", patients: duplicates }, { status: 409 });

    patientName = `${input.patient.firstName} ${input.patient.lastName}`;
    patientEmail = input.patient.email;
    patientCreated = true;
  }

  const localDate = format(toZonedTime(startUtc, CLINIC_TZ), "yyyy-MM-dd");
  const dayStart = fromZonedTime(`${localDate}T00:00:00`, CLINIC_TZ).toISOString();
  const dayEnd = fromZonedTime(`${addDaysToDateLabel(localDate, 1)}T00:00:00`, CLINIC_TZ).toISOString();
  const [{ data: rules, error: rulesError }, { data: physioAppointments, error: physioAppointmentsError }, { data: timeOff, error: timeOffError }, { data: patientAppointments, error: patientAppointmentsError }] = await Promise.all([
    admin.from("availability_rules").select("weekday, start_time, end_time").eq("physiotherapist_id", input.physioId),
    admin.from("appointments").select("starts_at, ends_at").eq("physiotherapist_id", input.physioId).neq("status", "cancelled").gte("starts_at", dayStart).lt("starts_at", dayEnd),
    admin.from("time_off").select("starts_at, ends_at").eq("physiotherapist_id", input.physioId).lt("starts_at", dayEnd).gt("ends_at", dayStart),
    patientId
      ? admin.from("appointments").select("starts_at, ends_at").eq("patient_id", patientId).neq("status", "cancelled").lt("starts_at", dayEnd).gt("ends_at", dayStart)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (rulesError || physioAppointmentsError || timeOffError || patientAppointmentsError) {
    return NextResponse.json({ error: "Could not verify appointment availability." }, { status: 500 });
  }

  const freeSlots = generateSlots({
    date: localDate,
    availabilityRules: rules ?? [],
    appointments: physioAppointments ?? [],
    timeOff: timeOff ?? [],
    now,
    leadTimeMinutes: DEFAULT_LEAD_TIME_MINUTES,
  });
  const patientSafeSlots = excludePatientConflicts(freeSlots, patientAppointments ?? []);
  if (!patientSafeSlots.some((slot) => slot.startUtc === startUtc.toISOString())) {
    return NextResponse.json({ error: "This time is no longer available. Please select another time." }, { status: 409 });
  }

  if (patientCreated && input.patient.kind === "new") {
    const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
      email: input.patient.email,
      email_confirm: true,
      user_metadata: { full_name: patientName },
    });
    if (authError || !createdUser.user) {
      const { data: existingProfile } = await admin.from("profiles").select("id, full_name, email, phone, avatar_url").eq("email", input.patient.email).eq("role", "patient").limit(1);
      if (existingProfile?.length) return NextResponse.json({ error: "A patient with this email already exists.", patients: existingProfile }, { status: 409 });
      return NextResponse.json({ error: "Could not create the patient profile." }, { status: 500 });
    }
    patientId = createdUser.user.id;
  }

  if (!patientId) return NextResponse.json({ error: "Could not select the patient profile." }, { status: 400 });

  const { data: appointmentRows, error: bookingError } = await admin.rpc("create_admin_appointment", {
    p_actor_id: auth.user.id,
    p_patient_id: patientId,
    p_physiotherapist_id: input.physioId,
    p_starts_at: startUtc.toISOString(),
    p_phone: input.patient.phone,
    p_reason_for_visit: input.reasonForVisit,
    p_comments_for_physiotherapist: input.commentsForPhysiotherapist ?? "",
    p_patient_created: patientCreated,
  });

  if (bookingError || !appointmentRows?.length) {
    let cleanupFailed = false;
    if (patientCreated) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(patientId);
      cleanupFailed = Boolean(cleanupError);
      if (cleanupError) console.error("[admin-booking] Could not remove unused Auth user after booking failure", cleanupError.message);
    }
    if (bookingError?.code === "23P01") {
      return NextResponse.json({ error: cleanupFailed ? "This time was taken, and the patient profile could not be removed. Please contact support before retrying." : "This time is no longer available. Please select another time." }, { status: 409 });
    }
    console.error("[admin-booking] Transactional appointment creation failed", bookingError?.code);
    if (bookingError?.code === "42702") {
      return NextResponse.json({
        error: cleanupFailed
          ? "The booking function needs migration 0007, and the unused patient profile could not be removed. Please contact support."
          : "The booking function needs migration 0007. Ask an administrator to apply the migration, then retry.",
      }, { status: 503 });
    }
    return NextResponse.json({ error: cleanupFailed ? "The appointment could not be created and the patient profile could not be removed. Please contact support." : "Could not create the appointment." }, { status: 500 });
  }

  const appointment = appointmentRows[0];
  const reference = appointmentReference(appointment.id);
  const startLocal = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
  const endLocal = toZonedTime(new Date(appointment.ends_at), CLINIC_TZ);
  const notificationResult = await notifyAppointment({
    event: "booking_created",
    reference,
    patientName,
    patientEmail,
    patientPhone: input.patient.phone,
    physiotherapistName: physio.full_name,
    date: format(startLocal, "yyyy-MM-dd"),
    startTime: format(startLocal, "HH:mm"),
    endTime: format(endLocal, "HH:mm"),
    reasonForVisit: input.reasonForVisit,
    status: "confirmed",
    sendPatient: input.sendConfirmation,
  });

  const { data: calendarToken, error: calendarTokenError } = await admin.from("google_tokens").select("user_id").eq("user_id", patientId).maybeSingle();
  const calendarEventId = calendarToken && !calendarTokenError
    ? await createEvent(patientId, {
      physiotherapistName: physio.full_name,
      physiotherapistEmail: physio.email,
      reasonForVisit: input.reasonForVisit,
      reference,
      startUtc: appointment.starts_at,
      endUtc: appointment.ends_at,
    })
    : null;
  if (calendarEventId) await admin.from("appointments").update({ google_event_id: calendarEventId }).eq("id", appointment.id);

  return NextResponse.json({
    id: appointment.id,
    reference,
    patient: { id: patientId, fullName: patientName, email: patientEmail, phone: input.patient.phone, created: patientCreated },
    physiotherapist: { id: physio.id, fullName: physio.full_name, specialisation: physio.specialisation },
    date: format(startLocal, "yyyy-MM-dd"),
    startTime: format(startLocal, "HH:mm"),
    endTime: format(endLocal, "HH:mm"),
    duration: 45,
    notification: notificationResult.patient,
    receptionNotification: notificationResult.reception,
    calendar: calendarEventId ? "created" : calendarTokenError || calendarToken ? "failed" : "not_connected",
  });
}
