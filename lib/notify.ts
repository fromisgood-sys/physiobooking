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
  physiotherapistEmail: string;
  /** "yyyy-MM-dd", clinic-local */
  date: string;
  /** "HH:mm", clinic-local */
  startTime: string;
  endTime: string;
  reasonForVisit?: string | null;
  status: string;
}

const FORMSPREE_ENDPOINT = process.env.FORMSPREE_ENDPOINT;
const RECEPTION_EMAIL = process.env.RECEPTION_EMAIL;
// Free per-recipient email: any SMTP account (e.g. Gmail + app password).
// Formspree only ever emails its own account owner, so it is a fallback only.
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;

async function sendSmtp(to: string, subject: string, text: string): Promise<boolean> {
  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
    await transport.sendMail({ from: `Physio Booking <${SMTP_FROM}>`, to, subject, text });
    return true;
  } catch (err) {
    console.warn("[notify] SMTP send failed", to, err);
    return false;
  }
}

const EVENT_VERB: Record<NotifyEvent, string> = {
  booking_created: "confirmed",
  rescheduled: "rescheduled",
  cancelled: "cancelled",
  admin_edit: "updated",
};

async function postToFormspree(payload: Record<string, unknown>): Promise<boolean> {
  if (!FORMSPREE_ENDPOINT) {
    console.warn("[notify] FORMSPREE_ENDPOINT not set — skipping", payload.event);
    return false;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
      console.warn(`[notify] Formspree responded ${res.status} (attempt ${attempt + 1})`);
    } catch (err) {
      console.warn(`[notify] Formspree request failed (attempt ${attempt + 1})`, err);
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Sends the patient + reception notification pair for an appointment event.
 * Never throws — email failures must never roll back a successful booking
 * (physio-booking-app-spec.md section 8). Failures are logged and swallowed.
 */
export async function notifyAppointment(params: NotifyAppointmentParams): Promise<void> {
  try {
    const verb = EVENT_VERB[params.event];
    const subject = `Appointment ${verb} — ${params.date}, ${params.startTime} with ${params.physiotherapistName}`;
    const message = `Your appointment with ${params.physiotherapistName} on ${params.date} at ${params.startTime} is ${verb}. Reference ${params.reference}. To reschedule or cancel, visit your appointments page.`;

    const basePayload = {
      _subject: subject,
      event: params.event,
      reference: params.reference,
      patient_name: params.patientName,
      patient_email: params.patientEmail,
      patient_phone: params.patientPhone,
      physiotherapist: params.physiotherapistName,
      physiotherapist_email: params.physiotherapistEmail,
      date: params.date,
      start_time: params.startTime,
      end_time: params.endTime,
      reason_for_visit: params.reasonForVisit ?? "",
      status: params.status,
      message,
    };

    if (SMTP_USER && SMTP_PASSWORD) {
      const details = [
        message,
        "",
        `Patient: ${params.patientName} (${params.patientEmail}, ${params.patientPhone})`,
        `Physiotherapist: ${params.physiotherapistName}`,
        `When: ${params.date}, ${params.startTime}-${params.endTime}`,
        params.reasonForVisit ? `Reason: ${params.reasonForVisit}` : "",
      ]
        .join("\n");
      if (RECEPTION_EMAIL) await sendSmtp(RECEPTION_EMAIL, subject, details);
      else console.warn("[notify] RECEPTION_EMAIL not set — skipping reception copy");
      return;
    }

    await postToFormspree({ ...basePayload, recipient: params.patientEmail });

    if (RECEPTION_EMAIL) {
      await postToFormspree({ ...basePayload, recipient: RECEPTION_EMAIL });
    } else {
      console.warn("[notify] RECEPTION_EMAIL not set — skipping reception copy");
    }
  } catch (err) {
    console.error("[notify] Unexpected error sending notifications", err);
  }
}
