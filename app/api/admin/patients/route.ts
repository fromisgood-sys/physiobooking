import { NextResponse } from "next/server";
import { addMonths, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth";
import { CLINIC_TZ } from "@/lib/tz";

const PATIENT_SELECT = "id, full_name, email, phone, avatar_url, created_at, appointments:appointments!appointments_patient_id_fkey(id, starts_at, ends_at, status, reason_for_visit, physiotherapists(full_name))";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = 12;
  const search = searchParams.get("q")?.trim().replace(/[%,]/g, "") ?? "";
  if (searchParams.get("metrics") === "1") {
    const now = toZonedTime(new Date(), CLINIC_TZ);
    const monthStart = fromZonedTime(`${format(now, "yyyy-MM")}-01T00:00:00`, CLINIC_TZ).toISOString();
    const monthEnd = fromZonedTime(`${format(addMonths(now, 1), "yyyy-MM")}-01T00:00:00`, CLINIC_TZ).toISOString();
    const [{ count: total }, { count: newPatients }, { count: appointmentsThisMonth }, { data: activeRows }] = await Promise.all([
      auth.supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
      auth.supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient").gte("created_at", monthStart).lt("created_at", monthEnd),
      auth.supabase.from("appointments").select("id", { count: "exact", head: true }).gte("starts_at", monthStart).lt("starts_at", monthEnd),
      auth.supabase.from("appointments").select("patient_id").neq("status", "cancelled"),
    ]);
    return NextResponse.json({ metrics: { totalPatients: total ?? 0, newPatientsThisMonth: newPatients ?? 0, appointmentsThisMonth: appointmentsThisMonth ?? 0, patientsWithAppointments: new Set((activeRows ?? []).map((row) => row.patient_id)).size } });
  }
  let query = auth.supabase.from("profiles").select(PATIENT_SELECT, { count: "exact" }).eq("role", "patient").order("full_name").range((page - 1) * pageSize, page * pageSize - 1);
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Could not load patients" }, { status: 500 });
  const rows = (data ?? []).map((patient) => {
    const rawAppointments = (patient as unknown as { appointments?: Array<{ id: string; starts_at: string; ends_at: string; status: string; reason_for_visit: string | null; physiotherapists: { full_name: string }[] | { full_name: string } | null }> }).appointments ?? [];
    const appointments = rawAppointments.map((appointment) => ({ ...appointment, physiotherapists: Array.isArray(appointment.physiotherapists) ? appointment.physiotherapists[0] ?? null : appointment.physiotherapists })).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    return { ...patient, appointments, appointment_count: appointments.length, last_appointment: appointments[0]?.starts_at ?? null };
  });
  return NextResponse.json({ patients: rows, total: count ?? 0, page, pageSize });
}
