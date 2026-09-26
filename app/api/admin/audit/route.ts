import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dateFromUtc, dateToUtc } from "@/lib/admin-appointments";

const PAGE_SIZE = 20;
const SELECT = "id, record_id, reference, module, action, details, summary, created_at, actor_id, actor_name, actor_email, actor_role";

// Supabase query builders do not expose a shared structural type in this project.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, searchParams: URLSearchParams) {
  const from = searchParams.get("from"); const to = searchParams.get("to"); const user = searchParams.get("user"); const action = searchParams.get("action"); const search = searchParams.get("q")?.trim().replace(/[%,]/g, "");
  if (from) query = query.gte("created_at", dateFromUtc(from));
  if (to) query = query.lte("created_at", dateToUtc(to));
  if (user) query = query.eq("actor_id", user);
  if (action) query = query.eq("action", action);
  if (search) query = query.or(`action.ilike.%${search}%,reference.ilike.%${search}%,summary.ilike.%${search}%`);
  return query;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const { searchParams } = new URL(request.url);
  if (searchParams.get("options") === "1") {
    const { data, error } = await auth.supabase.from("admin_audit_feed").select("actor_id, actor_name, actor_email");
    if (error) return NextResponse.json({ error: "Could not load audit users" }, { status: 500 });
    const users = new Map<string, { id: string; full_name: string | null; email: string }>();
    for (const row of data ?? []) { if (row.actor_id && row.actor_email) users.set(row.actor_id, { id: row.actor_id, full_name: row.actor_name, email: row.actor_email }); }
    return NextResponse.json({ users: [...users.values()] });
  }
  if (searchParams.get("metrics") === "1") {
    let metricsQuery = auth.supabase.from("admin_audit_feed").select("actor_id, action, module");
    metricsQuery = applyFilters(metricsQuery, searchParams);
    const { data, error } = await metricsQuery;
    if (error) return NextResponse.json({ error: "Could not load audit metrics" }, { status: 500 });
    const rows = data ?? [];
    return NextResponse.json({ metrics: { total: rows.length, users: new Set(rows.map((row) => row.actor_id).filter(Boolean)).size, appointments: rows.filter((row) => row.module === "Appointment").length, patientRecords: rows.filter((row) => row.module === "Patient").length, securityEvents: 0 } });
  }
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") ?? PAGE_SIZE) || PAGE_SIZE));
  let query = auth.supabase.from("admin_audit_feed").select(SELECT, { count: "exact" });
  query = applyFilters(query, searchParams).order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Could not load audit log" }, { status: 500 });
  const rows = (data ?? []).map((row) => ({
    id: row.id,
    appointment_id: row.record_id,
    reference: row.reference,
    module: row.module,
    summary: row.summary,
    action: row.action,
    old_values: null,
    new_values: row.details ?? (row.summary ? { summary: row.summary } : null),
    created_at: row.created_at,
    changed_by: row.actor_id,
    changed_by_profile: row.actor_id
      ? { full_name: row.actor_name, email: row.actor_email, role: row.actor_role }
      : null,
  }));
  return NextResponse.json({ rows, total: count ?? 0, page, pageSize });
}
