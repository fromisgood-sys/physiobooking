import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await auth.supabase
    .from("appointment_audit")
    .select(
      "id, appointment_id, action, old_values, new_values, created_at, changed_by:profiles!appointment_audit_changed_by_fkey(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: "Could not load audit log" }, { status: 500 });
  }

  return NextResponse.json({ rows: data, total: count ?? 0, page, pageSize: PAGE_SIZE });
}
