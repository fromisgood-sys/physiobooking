import { createClient } from "@/lib/supabase/server";
import { AppointmentsTabs } from "@/components/appointments/AppointmentsTabs";
import type { AppointmentRow } from "@/components/appointments/AppointmentCard";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, reason_for_visit, physiotherapists(id, full_name, specialisation)"
    )
    .eq("patient_id", user!.id)
    .order("starts_at", { ascending: true });

  const now = new Date();
  // supabase-js types this to-one embed as an array without generated
  // Database types; PostgREST returns a single object at runtime since the
  // FK lives on `appointments`.
  const rows = (data ?? []) as unknown as AppointmentRow[];
  const upcoming = rows.filter((a) => new Date(a.ends_at) > now);
  const past = rows.filter((a) => new Date(a.ends_at) <= now).reverse();

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        My appointments
      </h1>

      <AppointmentsTabs initialUpcoming={upcoming} initialPast={past} />
    </main>
  );
}
