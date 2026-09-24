import "server-only";
import ExcelJS from "exceljs";

export interface ExportRow {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  physiotherapist: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason: string;
  notes: string;
  created_at: string;
}

const COLUMNS: { header: string; key: keyof ExportRow }[] = [
  { header: "Patient", key: "patient_name" },
  { header: "Email", key: "patient_email" },
  { header: "Phone", key: "patient_phone" },
  { header: "Physiotherapist", key: "physiotherapist" },
  { header: "Date", key: "date" },
  { header: "Start", key: "start_time" },
  { header: "End", key: "end_time" },
  { header: "Status", key: "status" },
  { header: "Reason", key: "reason" },
  { header: "Notes", key: "notes" },
  { header: "Created at", key: "created_at" },
];

export async function buildAppointmentsWorkbook(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Appointments");

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((row) => sheet.addRow(row));

  sheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const length = String(cell.value ?? "").length;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.min(maxLength + 2, 60);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
