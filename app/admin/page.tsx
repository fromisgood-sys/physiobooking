import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { addDaysToDateLabel, CLINIC_TZ } from "@/lib/tz";
import {
  DashboardWorkspace,
  type DashboardAppointment,
  type DashboardPhysio,
} from "@/components/admin/DashboardWorkspace";

function validDateLabel(value: string | undefined, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? fallback : value;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const { date: requestedDate } = await searchParams;
  const clinicToday = format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd");
  const selectedDate = validDateLabel(requestedDate, clinicToday);
  const nextDay = addDaysToDateLabel(selectedDate, 1);
  const sevenDaysLater = addDaysToDateLabel(clinicToday, 7);
  const nowUtc = new Date().toISOString();
  const monthStart = `${clinicToday.slice(0, 7)}-01`;
  const [year, month] = clinicToday.slice(0, 7).split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const dayStartUtc = fromZonedTime(`${selectedDate}T00:00:00`, CLINIC_TZ).toISOString();
  const nextDayUtc = fromZonedTime(`${nextDay}T00:00:00`, CLINIC_TZ).toISOString();
  const weekEndUtc = fromZonedTime(`${sevenDaysLater}T00:00:00`, CLINIC_TZ).toISOString();
  const monthStartUtc = fromZonedTime(`${monthStart}T00:00:00`, CLINIC_TZ).toISOString();
  const nextMonthUtc = fromZonedTime(`${nextMonth}T00:00:00`, CLINIC_TZ).toISOString();

  const [
    { count: appointmentsToday, error: todayError },
    { count: upcomingSevenDays, error: upcomingError },
    { count: newPatients, error: patientsError },
    { count: cancellations, error: cancellationsError },
    { count: completed, error: completedError },
    { data: appointmentRows, error: appointmentsError },
    { data: physiotherapistRows, error: physiotherapistsError },
  ] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true }).neq("status", "cancelled").gte("starts_at", dayStartUtc).lt("starts_at", nextDayUtc),
    supabase.from("appointments").select("id", { count: "exact", head: true }).in("status", ["confirmed", "rescheduled"]).gte("starts_at", nowUtc).lt("starts_at", weekEndUtc),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient").gte("created_at", monthStartUtc).lt("created_at", nextMonthUtc),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("updated_at", monthStartUtc).lt("updated_at", nextMonthUtc),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed").gte("updated_at", monthStartUtc).lt("updated_at", nextMonthUtc),
    supabase.from("appointments").select("id, starts_at, ends_at, status, reason_for_visit, physiotherapist_id, patient:profiles!appointments_patient_id_fkey(full_name, email, phone), physiotherapists(full_name, specialisation)").gte("starts_at", dayStartUtc).lt("starts_at", nextDayUtc).order("starts_at", { ascending: true }),
    supabase.from("physiotherapists").select("id, full_name, specialisation, is_active").eq("is_active", true).order("full_name"),
  ]);

  const appointments = (appointmentRows ?? []) as unknown as DashboardAppointment[];
  const physiotherapists = (physiotherapistRows ?? []) as DashboardPhysio[];

  return (
    <DashboardWorkspace
      selectedDate={selectedDate}
      clinicToday={clinicToday}
      appointments={appointments}
      physiotherapists={physiotherapists}
      queryError={Boolean(todayError || upcomingError || patientsError || cancellationsError || completedError || appointmentsError || physiotherapistsError)}
      metrics={{ appointmentsToday, upcomingSevenDays, newPatients, cancellations, completed }}
    />
  );
}