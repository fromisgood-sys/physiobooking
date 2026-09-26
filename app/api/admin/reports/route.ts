import { NextResponse } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_APPOINTMENTS_SELECT, applyAdminAppointmentFilters, parseAdminAppointmentFilters } from "@/lib/admin-appointments";
import { CLINIC_TZ } from "@/lib/tz";

const STATUS_LABELS: Record<string, string> = { confirmed: "Confirmed", rescheduled: "Rescheduled", completed: "Completed", cancelled: "Cancelled", no_show: "No-show" };

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const { searchParams } = new URL(request.url);
  const filters = parseAdminAppointmentFilters(searchParams);
  let query = auth.supabase.from("appointments").select(ADMIN_APPOINTMENTS_SELECT);
  query = applyAdminAppointmentFilters(query, filters).order("starts_at", { ascending: true });
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load report data" }, { status: 500 });

  const rows = (data ?? []) as unknown as Array<{ id: string; starts_at: string; ends_at: string; status: string; reason_for_visit: string | null; patient: { full_name: string | null; email: string; phone: string | null } | null; physiotherapists: { full_name: string; photo_url?: string | null } | null }>;
  const statusCounts = new Map<string, number>();
  const daily = new Map<string, { date: string; total: number; completed: number; cancelled: number; no_show: number; scheduled: number; newPatients: number }>();
  const patients = new Set<string>();
  for (const row of rows) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    const local = toZonedTime(new Date(row.starts_at), CLINIC_TZ);
    const date = format(local, "yyyy-MM-dd");
    const bucket = daily.get(date) ?? { date, total: 0, completed: 0, cancelled: 0, no_show: 0, scheduled: 0, newPatients: 0 };
    bucket.total += 1;
    if (row.status === "completed") bucket.completed += 1;
    if (row.status === "cancelled") bucket.cancelled += 1;
    if (row.status === "no_show") bucket.no_show += 1;
    if (row.status === "confirmed" || row.status === "rescheduled") bucket.scheduled += 1;
    if (row.patient) patients.add(row.patient.email);
    daily.set(date, bucket);
  }
  const statuses = [...statusCounts.entries()].map(([status, count]) => ({ status, label: STATUS_LABELS[status] ?? status, count, percentage: rows.length ? Math.round((count / rows.length) * 100) : 0 }));
  const detailed = rows.slice(0, 500).map((row) => ({ id: row.id, starts_at: row.starts_at, ends_at: row.ends_at, status: row.status, reason_for_visit: row.reason_for_visit, patient: row.patient, physiotherapists: row.physiotherapists }));
  return NextResponse.json({ metrics: { total: rows.length, completed: statusCounts.get("completed") ?? 0, cancelled: statusCounts.get("cancelled") ?? 0, noShows: statusCounts.get("no_show") ?? 0, newPatients: patients.size }, statuses, summary: [...daily.values()], detailed, totalDetailed: rows.length, timezone: CLINIC_TZ });
}
