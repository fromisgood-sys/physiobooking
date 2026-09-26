import { NextResponse } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth";
import { buildPatientsWorkbook, type PatientExportRow } from "@/lib/excel";
import { CLINIC_TZ } from "@/lib/tz";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const search = new URL(request.url).searchParams.get("q")?.trim().replace(/[%,]/g, "") ?? "";
  let query = auth.supabase.from("profiles").select("id, full_name, email, phone, appointments:appointments!appointments_patient_id_fkey(id, starts_at)").eq("role", "patient").order("full_name");
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not export patients" }, { status: 500 });
  const rows = (data ?? []).map((patient) => {
    const appointments = [...((patient as { appointments?: Array<{ starts_at: string }> }).appointments ?? [])].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    return { patient_name: patient.full_name ?? "", phone: patient.phone ?? "", email: patient.email, appointments: appointments.length, last_appointment: appointments[0] ? format(toZonedTime(new Date(appointments[0].starts_at), CLINIC_TZ), "yyyy-MM-dd HH:mm") : "" } satisfies PatientExportRow;
  });
  const buffer = await buildPatientsWorkbook(rows);
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=patients.xlsx" } });
}