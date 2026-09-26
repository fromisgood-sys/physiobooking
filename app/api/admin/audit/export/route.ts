import { NextResponse } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth";
import { dateFromUtc, dateToUtc } from "@/lib/admin-appointments";
import { buildAuditWorkbook, type AuditExportRow } from "@/lib/excel";
import { CLINIC_TZ } from "@/lib/tz";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const params = new URL(request.url).searchParams;
  let query = auth.supabase.from("admin_audit_feed").select("reference, module, action, summary, created_at, actor_name, actor_email").order("created_at", { ascending: false });
  if (params.get("from")) query = query.gte("created_at", dateFromUtc(params.get("from")!));
  if (params.get("to")) query = query.lte("created_at", dateToUtc(params.get("to")!));
  if (params.get("user")) query = query.eq("actor_id", params.get("user")!);
  if (params.get("action")) query = query.eq("action", params.get("action")!);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not export audit log" }, { status: 500 });
  const rows = (data ?? []).map((row) => ({ date_time: format(toZonedTime(new Date(row.created_at), CLINIC_TZ), "yyyy-MM-dd HH:mm"), user: row.actor_name ?? "System", email: row.actor_email ?? "", action: row.action, module: row.module, record_reference: row.reference, details: row.summary } satisfies AuditExportRow));
  const buffer = await buildAuditWorkbook(rows);
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename=audit-log-${format(new Date(), "yyyy-MM-dd")}.xlsx` } });
}