import { NextResponse } from "next/server";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { requireAdmin } from "@/lib/auth";
import {
  ADMIN_APPOINTMENTS_SELECT,
  applyAdminAppointmentFilters,
  parseAdminAppointmentFilters,
} from "@/lib/admin-appointments";
import { buildAppointmentsWorkbook, type ExportRow } from "@/lib/excel";
import { CLINIC_TZ } from "@/lib/tz";

interface AdminAppointmentRow {
  starts_at: string;
  ends_at: string;
  status: string;
  reason_for_visit: string | null;
  notes: string | null;
  created_at: string;
  patient: { full_name: string | null; email: string; phone: string | null } | null;
  physiotherapists: { full_name: string } | null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const filters = parseAdminAppointmentFilters(searchParams);

  let query = auth.supabase.from("appointments").select(ADMIN_APPOINTMENTS_SELECT);
  query = applyAdminAppointmentFilters(query, filters);
  query = query.order("starts_at", { ascending: true });

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load appointments" }, { status: 500 });
  }

  const rows = ((data ?? []) as unknown as AdminAppointmentRow[]).map((row): ExportRow => {
    const start = toZonedTime(new Date(row.starts_at), CLINIC_TZ);
    const end = toZonedTime(new Date(row.ends_at), CLINIC_TZ);
    const created = toZonedTime(new Date(row.created_at), CLINIC_TZ);

    return {
      patient_name: row.patient?.full_name ?? "",
      patient_email: row.patient?.email ?? "",
      patient_phone: row.patient?.phone ?? "",
      physiotherapist: row.physiotherapists?.full_name ?? "",
      date: format(start, "yyyy-MM-dd"),
      start_time: format(start, "HH:mm"),
      end_time: format(end, "HH:mm"),
      status: row.status,
      reason: row.reason_for_visit ?? "",
      notes: row.notes ?? "",
      created_at: format(created, "yyyy-MM-dd HH:mm"),
    };
  });

  const buffer = await buildAppointmentsWorkbook(rows);
  const from = filters.dateFrom ?? "all";
  const to = filters.dateTo ?? "all";
  const filename = `appointments_${from}_to_${to}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
