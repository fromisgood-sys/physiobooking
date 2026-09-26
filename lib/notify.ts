import "server-only";
import nodemailer from "nodemailer";

export type NotifyEvent = "booking_created" | "rescheduled" | "cancelled" | "admin_edit";

export interface NotifyAppointmentParams {
  event: NotifyEvent;
  reference: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  physiotherapistName: string;
  /** "yyyy-MM-dd", clinic-local */
  date: string;
  /** "HH:mm", clinic-local */
  startTime: string;
  endTime: string;
  reasonForVisit?: string | null;
  status: string;
  sendPatient?: boolean;
  sendReception?: boolean;
}

export type MailDeliveryStatus = "sent" | "failed" | "not_requested" | "not_configured";

export interface NotifyAppointmentResult {
  patient: MailDeliveryStatus;
  reception: MailDeliveryStatus;
}

const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASSWORD = process.env.SMTP_PASSWORD?.replace(/\s/g, "");
const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_FROM = process.env.SMTP_FROM?.trim() || SMTP_USER;
const RECEPTION_EMAIL = process.env.RECEPTION_EMAIL?.trim();

const transport = SMTP_USER && SMTP_PASSWORD
  ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  })
  : null;

async function sendSmtp(to: string, subject: string, text: string): Promise<boolean> {
  if (!transport || !SMTP_FROM) return false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await transport.sendMail({ from: `Physio Booking <${SMTP_FROM}>`, to, subject, text });
      return true;
    } catch (err) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        console.warn("[notify] SMTP send failed after retry", to, err);
      }
    }
  }
  return false;
}

const EVENT_VERB: Record<NotifyEvent, string> = {
  booking_created: "confirmed",
  rescheduled: "rescheduled",
  cancelled: "cancelled",
  admin_edit: "updated",
};

/**
 * Sends only through the clinic's SMTP account, separately to the patient and
 * configured reception inbox. Never throws: mail failures cannot roll back a
 * successful booking or appointment update.
 */
export async function notifyAppointment(params: NotifyAppointmentParams): Promise<NotifyAppointmentResult> {
  const verb = EVENT_VERB[params.event];
  const subject = `Appointment ${verb} — ${params.date}, ${params.startTime} with ${params.physiotherapistName}`;
  const patientMessage = `Your appointment with ${params.physiotherapistName} on ${params.date} at ${params.startTime} is ${verb}. Reference ${params.reference}. To manage your booking, visit the appointments page.`;
  const receptionMessage = [
    `Appointment ${verb}.`,
    `Reference: ${params.reference}`,
    `Patient: ${params.patientName} (${params.patientEmail}, ${params.patientPhone})`,
    `Physiotherapist: ${params.physiotherapistName}`,
    `When: ${params.date}, ${params.startTime}-${params.endTime}`,
    `Status: ${params.status}`,
  ].join("\n");

  let patient: MailDeliveryStatus = "not_requested";
  if (params.sendPatient !== false) {
    patient = !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM
      ? "not_configured"
      : await sendSmtp(params.patientEmail, subject, patientMessage) ? "sent" : "failed";
  }

  let reception: MailDeliveryStatus = "not_requested";
  if (params.sendReception !== false) {
    if (!RECEPTION_EMAIL) {
      reception = "not_configured";
      console.warn("[notify] RECEPTION_EMAIL not set — reception notification skipped", params.event);
    } else if (!SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
      reception = "not_configured";
    } else {
      reception = await sendSmtp(RECEPTION_EMAIL, subject, receptionMessage) ? "sent" : "failed";
    }
  }

  if ((!SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) && (patient === "not_configured" || reception === "not_configured")) {
    console.warn("[notify] SMTP is not configured; appointment mail was not sent", params.event);
  }

  return { patient, reception };
}
