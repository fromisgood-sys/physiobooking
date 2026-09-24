import { NextResponse } from "next/server";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlots } from "@/lib/slots";
import { CLINIC_TZ } from "@/lib/tz";

const querySchema = z.object({
  physioId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    physioId: searchParams.get("physioId"),
    date: searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid physioId or date" }, { status: 400 });
  }

  const { physioId, date } = parsed.data;

  // Availability must be computed from every patient's bookings for this
  // physio, not just the caller's own — RLS on `appointments` only exposes a
  // patient's own rows, so this runs with the service role. Only the derived
  // free-slot list is returned; no appointment rows ever reach the client.
  const admin = createAdminClient();

  const { data: physio } = await admin
    .from("physiotherapists")
    .select("id")
    .eq("id", physioId)
    .eq("is_active", true)
    .maybeSingle();

  if (!physio) {
    return NextResponse.json({ error: "Physiotherapist not found" }, { status: 404 });
  }

  const [{ data: rules, error: rulesError }, { data: appointments, error: apptError }] =
    await Promise.all([
      admin
        .from("availability_rules")
        .select("weekday, start_time, end_time")
        .eq("physiotherapist_id", physioId),
      (() => {
        const dayStartUtc = fromZonedTime(`${date}T00:00:00`, CLINIC_TZ);
        const dayEndUtc = fromZonedTime(`${date}T23:59:59.999`, CLINIC_TZ);
        return admin
          .from("appointments")
          .select("starts_at, ends_at")
          .eq("physiotherapist_id", physioId)
          .neq("status", "cancelled")
          .gte("starts_at", dayStartUtc.toISOString())
          .lte("starts_at", dayEndUtc.toISOString());
      })(),
    ]);

  if (rulesError || apptError) {
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }

  const dayStartUtc = fromZonedTime(`${date}T00:00:00`, CLINIC_TZ);
  const dayEndUtc = fromZonedTime(`${date}T23:59:59.999`, CLINIC_TZ);

  const { data: timeOff, error: timeOffError } = await admin
    .from("time_off")
    .select("starts_at, ends_at")
    .eq("physiotherapist_id", physioId)
    .lte("starts_at", dayEndUtc.toISOString())
    .gte("ends_at", dayStartUtc.toISOString());

  if (timeOffError) {
    return NextResponse.json({ error: "Could not load time off" }, { status: 500 });
  }

  const slots = generateSlots({
    date,
    availabilityRules: rules ?? [],
    appointments: appointments ?? [],
    timeOff: timeOff ?? [],
  });

  return NextResponse.json({ slots });
}
