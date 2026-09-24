import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  ADMIN_APPOINTMENTS_SELECT,
  applyAdminAppointmentFilters,
  parseAdminAppointmentFilters,
  parseAdminSort,
} from "@/lib/admin-appointments";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const filters = parseAdminAppointmentFilters(searchParams);
  const { sortBy, ascending } = parseAdminSort(searchParams);

  let query = auth.supabase
    .from("appointments")
    .select(ADMIN_APPOINTMENTS_SELECT, { count: "exact" });
  query = applyAdminAppointmentFilters(query, filters);
  query = query.order(sortBy, { ascending }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "Could not load appointments" }, { status: 500 });
  }

  return NextResponse.json({ rows: data, total: count ?? 0, page, pageSize: PAGE_SIZE });
}
