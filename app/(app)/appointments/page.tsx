import { createClient } from "@/lib/supabase/server";
import { AppointmentsTabs } from "@/components/appointments/AppointmentsTabs";
import type { AppointmentRow } from "@/components/appointments/AppointmentCard";
import { appointmentReference } from "@/lib/reference";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data, error }, { data: profile }, { data: rules }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, reason_for_visit, physiotherapists(id, full_name, specialisation, photo_url)"
      )
      .eq("patient_id", user!.id)
      .order("starts_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("full_name, avatar_url, phone")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase.from("availability_rules").select("physiotherapist_id, weekday"),
  ]);

  const now = new Date();
  const rows = (data ?? []) as unknown as AppointmentRow[];
  const upcoming = rows
    .filter((appointment) =>
      new Date(appointment.ends_at) > now &&
      ["confirmed", "rescheduled"].includes(appointment.status)
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const previous = rows
    .filter((appointment) => !upcoming.includes(appointment))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const weekdaysByPhysio = new Map<string, number[]>();
  for (const rule of rules ?? []) {
    const weekdays = weekdaysByPhysio.get(rule.physiotherapist_id) ?? [];
    if (!weekdays.includes(rule.weekday)) weekdays.push(rule.weekday);
    weekdaysByPhysio.set(rule.physiotherapist_id, weekdays);
  }
  return (
    <AppointmentsTabs
      initialUpcoming={upcoming.map((appointment) => ({ ...appointment, reference: appointmentReference(appointment.id), availableWeekdays: weekdaysByPhysio.get(appointment.physiotherapists?.id ?? "") ?? [] }))}
      initialPrevious={previous.map((appointment) => ({ ...appointment, reference: appointmentReference(appointment.id), availableWeekdays: weekdaysByPhysio.get(appointment.physiotherapists?.id ?? "") ?? [] }))}
      profileName={profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "Patient"}
      avatarUrl={profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null}
      phoneNumber={profile?.phone ?? ""}
      loadError={Boolean(error)}
    />
  );
}
