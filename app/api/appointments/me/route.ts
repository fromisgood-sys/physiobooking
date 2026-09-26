import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appointmentReference } from "@/lib/reference";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data, error }, { data: profile }, { data: rules }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, reason_for_visit, physiotherapists(id, full_name, specialisation, photo_url)"
      )
      .eq("patient_id", user.id)
      .order("starts_at", { ascending: true }),
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    supabase.from("availability_rules").select("physiotherapist_id, weekday"),
  ]);

  if (error) {
    return NextResponse.json({ error: "Could not load appointments" }, { status: 500 });
  }

  const now = Date.now();
  const weekdaysByPhysio = new Map<string, number[]>();
  for (const rule of rules ?? []) {
    const weekdays = weekdaysByPhysio.get(rule.physiotherapist_id) ?? [];
    if (!weekdays.includes(rule.weekday)) weekdays.push(rule.weekday);
    weekdaysByPhysio.set(rule.physiotherapist_id, weekdays);
  }
  const rows = (data ?? []).map((record) => {
    const appointment = record as unknown as {
      id: string;
      starts_at: string;
      ends_at: string;
      status: string;
      reason_for_visit: string | null;
      physiotherapists: { id: string; full_name: string; specialisation: string | null; photo_url: string | null } | null;
    };
    return {
      ...appointment,
      reference: appointmentReference(appointment.id),
      availableWeekdays: weekdaysByPhysio.get(appointment.physiotherapists?.id ?? "") ?? [],
    };
  });
  const upcoming = rows
    .filter((appointment) =>
      new Date(appointment.ends_at).getTime() > now &&
      ["confirmed", "rescheduled"].includes(appointment.status)
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = rows
    .filter((appointment) => !upcoming.includes(appointment))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  return NextResponse.json({ upcoming, past, phone: profile?.phone ?? "" });
}
