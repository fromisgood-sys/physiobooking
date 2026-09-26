import { NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { excludePatientConflicts, generateSlots } from "@/lib/slots";
import { addDaysToDateLabel, CLINIC_TZ } from "@/lib/tz";

const querySchema = z.object({
  physioId: z.string().uuid(),
  patientId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    physioId: url.searchParams.get("physioId"),
    patientId: url.searchParams.get("patientId") || undefined,
    date: url.searchParams.get("date"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid availability request" }, { status: 400 });

  const { physioId, date } = parsed.data;
  const admin = createAdminClient();
  const { data: physio } = await admin
    .from("physiotherapists")
    .select("id")
    .eq("id", physioId)
    .eq("is_active", true)
    .maybeSingle();
  if (!physio) return NextResponse.json({ error: "Physiotherapist not found" }, { status: 404 });

  const dayStartUtc = fromZonedTime(`${date}T00:00:00`, CLINIC_TZ);
  const nextDayUtc = fromZonedTime(`${addDaysToDateLabel(date, 1)}T00:00:00`, CLINIC_TZ);
  const dayStart = dayStartUtc.toISOString();
  const dayEnd = nextDayUtc.toISOString();
  const [{ data: rules, error: rulesError }, { data: appointments, error: appointmentsError }, { data: timeOff, error: timeOffError }, { data: patientAppointments, error: patientError }] = await Promise.all([
    admin.from("availability_rules").select("weekday, start_time, end_time").eq("physiotherapist_id", physioId),
    admin.from("appointments").select("starts_at, ends_at").eq("physiotherapist_id", physioId).neq("status", "cancelled").gte("starts_at", dayStart).lt("starts_at", dayEnd),
    admin.from("time_off").select("starts_at, ends_at").eq("physiotherapist_id", physioId).lt("starts_at", dayEnd).gt("ends_at", dayStart),
    parsed.data.patientId
      ? admin.from("appointments").select("starts_at, ends_at").eq("patient_id", parsed.data.patientId).neq("status", "cancelled").lt("starts_at", dayEnd).gt("ends_at", dayStart)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (rulesError || appointmentsError || timeOffError || patientError) {
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }

  const slots = generateSlots({
    date,
    availabilityRules: rules ?? [],
    appointments: appointments ?? [],
    timeOff: timeOff ?? [],
  });
  const availableSlots = excludePatientConflicts(slots, patientAppointments ?? []);
  return NextResponse.json({ slots: availableSlots });
}
