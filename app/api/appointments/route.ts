import { NextResponse } from "next/server";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlots } from "@/lib/slots";
import { createAppointmentSchema, isPastInstant, isOnBookableGrid } from "@/lib/validation";
import { CLINIC_TZ, DEFAULT_LEAD_TIME_MINUTES } from "@/lib/tz";
import { appointmentReference } from "@/lib/reference";
import { notifyAppointment } from "@/lib/notify";
import { createEvent } from "@/lib/google-calendar";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAppointmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking details" }, { status: 400 });
  }

  const { physioId, startUtc: startUtcStr, phone, reasonForVisit } = parsed.data;
  const startUtc = new Date(startUtcStr);
  const now = new Date();

  if (isPastInstant(startUtc, now, DEFAULT_LEAD_TIME_MINUTES)) {
    return NextResponse.json(
      { error: "That time has already passed. Pick another." },
      { status: 400 }
    );
  }

  if (!isOnBookableGrid(startUtc, CLINIC_TZ)) {
    return NextResponse.json(
      { error: "That time is outside clinic hours." },
      { status: 400 }
    );
  }

  const { data: physio } = await supabase
    .from("physiotherapists")
    .select("id, full_name, email")
    .eq("id", physioId)
    .eq("is_active", true)
    .maybeSingle();

  if (!physio) {
    return NextResponse.json({ error: "Physiotherapist not found" }, { status: 404 });
  }

  // Authoritative re-check across every patient's bookings for this physio —
  // the same computation /api/availability uses, run again here so a client
  // can't post a stale or tampered-with slot. Needs the service role since
  // RLS only exposes a patient's own appointments.
  const admin = createAdminClient();
  const date = format(toZonedTime(startUtc, CLINIC_TZ), "yyyy-MM-dd");

  const [{ data: rules }, { data: appointments }, { data: timeOff }] = await Promise.all([
    admin
      .from("availability_rules")
      .select("weekday, start_time, end_time")
      .eq("physiotherapist_id", physioId),
    admin
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("physiotherapist_id", physioId)
      .neq("status", "cancelled"),
    admin.from("time_off").select("starts_at, ends_at").eq("physiotherapist_id", physioId),
  ]);

  const freeSlots = generateSlots({
    date,
    availabilityRules: rules ?? [],
    appointments: appointments ?? [],
    timeOff: timeOff ?? [],
    now,
  });

  const stillFree = freeSlots.some((s) => s.startUtc === startUtc.toISOString());
  if (!stillFree) {
    return NextResponse.json(
      { error: "That time was just taken. Pick another." },
      { status: 409 }
    );
  }

  // Keep the patient's contact number current for future notifications.
  await supabase.from("profiles").update({ phone }).eq("id", user.id);

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      patient_id: user.id,
      physiotherapist_id: physioId,
      starts_at: startUtc.toISOString(),
      reason_for_visit: reasonForVisit ?? null,
      created_by: user.id,
    })
    .select("id, starts_at, ends_at")
    .single();

  if (insertError) {
    // Postgres exclusion_violation — another booking won the race for this slot.
    if (insertError.code === "23P01") {
      return NextResponse.json(
        { error: "That time was just taken. Pick another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not create the booking" }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const localStart = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
  const localEnd = toZonedTime(new Date(appointment.ends_at), CLINIC_TZ);
  const reference = appointmentReference(appointment.id);

  // Calendar failures must never fail the booking — createEvent already
  // catches internally and returns null rather than throwing. A null id is
  // stored as-is; nothing here retries beyond what createEvent already does.
  const googleEventId = await createEvent(user.id, {
    physiotherapistName: physio.full_name,
    physiotherapistEmail: physio.email,
    reasonForVisit: reasonForVisit ?? null,
    reference,
    startUtc: appointment.starts_at,
    endUtc: appointment.ends_at,
  });

  if (googleEventId) {
    await supabase
      .from("appointments")
      .update({ google_event_id: googleEventId })
      .eq("id", appointment.id);
  }

  // Never let a notification failure fail the booking response — notifyAppointment
  // already catches internally, this await only adds latency, not risk.
  await notifyAppointment({
    event: "booking_created",
    reference,
    patientName: profile?.full_name ?? user.email ?? "Patient",
    patientEmail: user.email ?? "",
    patientPhone: phone,
    physiotherapistName: physio.full_name,
    physiotherapistEmail: physio.email,
    date: format(localStart, "yyyy-MM-dd"),
    startTime: format(localStart, "HH:mm"),
    endTime: format(localEnd, "HH:mm"),
    reasonForVisit: reasonForVisit ?? null,
    status: "confirmed",
  });

  return NextResponse.json({
    id: appointment.id,
    reference,
    startUtc: appointment.starts_at,
    endUtc: appointment.ends_at,
  });
}
