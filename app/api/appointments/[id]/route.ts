import { NextResponse } from "next/server";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlots } from "@/lib/slots";
import {
  rescheduleAppointmentSchema,
  adminUpdateAppointmentSchema,
  isPastInstant,
  isOnBookableGrid,
} from "@/lib/validation";
import { CLINIC_TZ, DEFAULT_LEAD_TIME_MINUTES } from "@/lib/tz";
import { appointmentReference } from "@/lib/reference";
import { notifyAppointment } from "@/lib/notify";
import { updateEvent, deleteEvent } from "@/lib/google-calendar";

const ACTIVE_STATUSES = ["confirmed", "rescheduled"];

interface OwnedAppointment {
  id: string;
  patient_id: string;
  physiotherapist_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reason_for_visit: string | null;
  google_event_id: string | null;
  // supabase-js types this to-one embed as an array without generated
  // Database types; PostgREST actually returns a single object at runtime
  // since the FK lives on `appointments`. Cast, don't index, at the callers.
  physiotherapists: { full_name: string; email: string } | null;
}

async function loadOwnedAppointment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
) {
  const result = await supabase
    .from("appointments")
    .select(
      "id, patient_id, physiotherapist_id, starts_at, ends_at, status, reason_for_visit, google_event_id, physiotherapists(full_name, email)"
    )
    .eq("id", id)
    .maybeSingle();

  return { data: result.data as unknown as OwnedAppointment | null, error: result.error };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = callerProfile?.role === "admin";

  const body = await request.json().catch(() => null);
  const schema = isAdmin ? adminUpdateAppointmentSchema : rescheduleAppointmentSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update details" }, { status: 400 });
  }
  // Only admins can send physioId/status/notes; a patient's payload only ever has startUtc.
  const data = parsed.data as Partial<
    { startUtc: string; physioId: string; status: "completed" | "no_show"; notes: string | null }
  >;

  const { data: existing, error: fetchError } = await loadOwnedAppointment(supabase, id);
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (existing.status === "cancelled") {
    return NextResponse.json(
      { error: "This appointment can no longer be edited." },
      { status: 400 }
    );
  }

  const changesTimeOrPhysio =
    Boolean(data.startUtc) || (isAdmin && Boolean(data.physioId) && data.physioId !== existing.physiotherapist_id);

  if (!changesTimeOrPhysio) {
    // Status (completed/no-show) and/or notes only — no slot to re-validate.
    if (!isAdmin) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: updated, error: updateError } = await supabase
      .from("appointments")
      .update(patch)
      .eq("id", id)
      .select("id, starts_at, ends_at, status")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: "Could not update the appointment" }, { status: 500 });
    }

    if (data.status) {
      const physio = existing.physiotherapists;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", existing.patient_id)
        .maybeSingle();

      if (physio) {
        const localStart = toZonedTime(new Date(updated.starts_at), CLINIC_TZ);
        const localEnd = toZonedTime(new Date(updated.ends_at), CLINIC_TZ);

        await notifyAppointment({
          event: "admin_edit",
          reference: appointmentReference(updated.id),
          patientName: profile?.full_name ?? "Patient",
          patientEmail: profile?.email ?? "",
          patientPhone: profile?.phone ?? "",
          physiotherapistName: physio.full_name,
          physiotherapistEmail: physio.email,
          date: format(localStart, "yyyy-MM-dd"),
          startTime: format(localStart, "HH:mm"),
          endTime: format(localEnd, "HH:mm"),
          reasonForVisit: existing.reason_for_visit,
          status: updated.status,
        });
      }
    }

    return NextResponse.json({
      id: updated.id,
      startUtc: updated.starts_at,
      endUtc: updated.ends_at,
      status: updated.status,
    });
  }

  if (!ACTIVE_STATUSES.includes(existing.status)) {
    return NextResponse.json(
      { error: "This appointment can no longer be rescheduled." },
      { status: 400 }
    );
  }

  const targetPhysioId = (isAdmin && data.physioId) || existing.physiotherapist_id;
  const startUtc = data.startUtc ? new Date(data.startUtc) : new Date(existing.starts_at);
  const now = new Date();

  if (isPastInstant(startUtc, now, DEFAULT_LEAD_TIME_MINUTES)) {
    return NextResponse.json(
      { error: "That time has already passed. Pick another." },
      { status: 400 }
    );
  }

  if (!isOnBookableGrid(startUtc, CLINIC_TZ)) {
    return NextResponse.json({ error: "That time is outside clinic hours." }, { status: 400 });
  }

  const admin = createAdminClient();
  const date = format(toZonedTime(startUtc, CLINIC_TZ), "yyyy-MM-dd");

  const { data: targetPhysio } = await admin
    .from("physiotherapists")
    .select("id, full_name, email")
    .eq("id", targetPhysioId)
    .eq("is_active", true)
    .maybeSingle();

  if (!targetPhysio) {
    return NextResponse.json({ error: "Physiotherapist not found" }, { status: 404 });
  }

  const [{ data: rules }, { data: appointments }, { data: timeOff }] = await Promise.all([
    admin
      .from("availability_rules")
      .select("weekday, start_time, end_time")
      .eq("physiotherapist_id", targetPhysioId),
    admin
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("physiotherapist_id", targetPhysioId)
      .neq("status", "cancelled")
      .neq("id", id),
    admin.from("time_off").select("starts_at, ends_at").eq("physiotherapist_id", targetPhysioId),
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

  const updatePatch: Record<string, unknown> = {
    starts_at: startUtc.toISOString(),
    physiotherapist_id: targetPhysioId,
    status: "rescheduled",
  };
  if (isAdmin && data.notes !== undefined) updatePatch.notes = data.notes;

  const { data: updated, error: updateError } = await supabase
    .from("appointments")
    .update(updatePatch)
    .eq("id", id)
    .select("id, starts_at, ends_at")
    .single();

  if (updateError) {
    if (updateError.code === "23P01") {
      return NextResponse.json(
        { error: "That time was just taken. Pick another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not reschedule the booking" }, { status: 500 });
  }

  const physio = targetPhysio;
  const reference = appointmentReference(updated.id);

  if (existing.google_event_id) {
    await updateEvent(existing.patient_id, existing.google_event_id, {
      physiotherapistName: physio.full_name,
      physiotherapistEmail: physio.email,
      reasonForVisit: existing.reason_for_visit,
      reference,
      startUtc: updated.starts_at,
      endUtc: updated.ends_at,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", existing.patient_id)
    .maybeSingle();

  const localStart = toZonedTime(new Date(updated.starts_at), CLINIC_TZ);
  const localEnd = toZonedTime(new Date(updated.ends_at), CLINIC_TZ);

  await notifyAppointment({
    event: "rescheduled",
    reference,
    patientName: profile?.full_name ?? "Patient",
    patientEmail: profile?.email ?? "",
    patientPhone: profile?.phone ?? "",
    physiotherapistName: physio.full_name,
    physiotherapistEmail: physio.email,
    date: format(localStart, "yyyy-MM-dd"),
    startTime: format(localStart, "HH:mm"),
    endTime: format(localEnd, "HH:mm"),
    reasonForVisit: existing.reason_for_visit,
    status: "rescheduled",
  });

  return NextResponse.json({
    id: updated.id,
    reference,
    startUtc: updated.starts_at,
    endUtc: updated.ends_at,
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await loadOwnedAppointment(supabase, id);
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (existing.status === "cancelled") {
    return NextResponse.json({ success: true });
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Could not cancel the booking" }, { status: 500 });
  }

  const physio = existing.physiotherapists;

  if (existing.google_event_id) {
    await deleteEvent(existing.patient_id, existing.google_event_id);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", existing.patient_id)
    .maybeSingle();

  if (physio) {
    const localStart = toZonedTime(new Date(existing.starts_at), CLINIC_TZ);
    const localEnd = toZonedTime(new Date(existing.ends_at), CLINIC_TZ);

    await notifyAppointment({
      event: "cancelled",
      reference: appointmentReference(existing.id),
      patientName: profile?.full_name ?? "Patient",
      patientEmail: profile?.email ?? "",
      patientPhone: profile?.phone ?? "",
      physiotherapistName: physio.full_name,
      physiotherapistEmail: physio.email,
      date: format(localStart, "yyyy-MM-dd"),
      startTime: format(localStart, "HH:mm"),
      endTime: format(localEnd, "HH:mm"),
      reasonForVisit: existing.reason_for_visit,
      status: "cancelled",
    });
  }

  return NextResponse.json({ success: true });
}
