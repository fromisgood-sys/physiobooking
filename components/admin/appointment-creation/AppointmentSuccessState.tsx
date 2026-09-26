"use client";

import { CheckCircle2, ExternalLink, Mail, CalendarDays, RotateCcw, X } from "lucide-react";
import type { CreatedAppointment } from "./types";

export function AppointmentSuccessState({ appointment, onView, onCreateAnother, onClose }: {
  appointment: CreatedAppointment;
  onView: () => void;
  onCreateAnother: () => void;
  onClose: () => void;
}) {
  return (
    <section aria-labelledby="appointment-created-heading" className="flex min-h-full flex-col items-center justify-center px-1 py-8 text-center">
      <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f5ef] text-[#187b68]"><CheckCircle2 className="h-8 w-8" /></span>
      <h2 id="appointment-created-heading" className="mt-4 text-[20px] font-bold text-[#19364c]">Appointment Created</h2>
      <p className="mt-1 text-[12px] text-[#718596]">{appointment.reference} · {appointment.patient.fullName}</p>
      <div className="mt-5 w-full rounded-[8px] border border-[#e3e9ed] bg-white p-4 text-left">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-semibold text-[#19364c]">{appointment.physiotherapist.fullName}</p><p className="mt-0.5 text-[10px] text-[#718596]">{appointment.physiotherapist.specialisation ?? "Physiotherapist"}</p></div><span className="rounded-[4px] bg-[#eef6f5] px-2 py-1 text-[9px] font-semibold text-[#107f7b]">45 min</span></div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf1f2] pt-3"><Value label="Date" value={appointment.date} /><Value label="Time" value={`${appointment.startTime}–${appointment.endTime}`} /><Value label="Patient" value={appointment.patient.fullName} /><Value label="Reference" value={appointment.reference} /></div>
      </div>
      <div className="mt-3 w-full space-y-2 rounded-[8px] border border-[#e3e9ed] p-3 text-left text-[10px] text-[#617988]">
        <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#148b86]" aria-hidden="true" />{mailStatus("patient", appointment.notification)}</p>
        <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#148b86]" aria-hidden="true" />{mailStatus("reception", appointment.receptionNotification)}</p>
        <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-[#148b86]" aria-hidden="true" />{appointment.calendar === "created" ? "Google Calendar event created." : appointment.calendar === "failed" ? "Appointment saved, but Google Calendar could not be updated." : "Google Calendar was not connected."}</p>
      </div>
      <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row"><button type="button" onClick={onView} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[7px] bg-[#107f7b] px-3 text-[11px] font-semibold text-white hover:bg-[#096965]">View Appointment <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></button><button type="button" onClick={onCreateAnother} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[7px] border border-[#dce5e9] px-3 text-[11px] font-semibold text-[#38566b] hover:bg-[#f6f8f9]"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Create Another</button><button type="button" onClick={onClose} aria-label="Close appointment-created panel" className="flex min-h-11 min-w-11 items-center justify-center rounded-[7px] border border-[#dce5e9] text-[#617988] hover:bg-[#f6f8f9]"><X className="h-4 w-4" aria-hidden="true" /></button></div>
    </section>
  );
}

function mailStatus(recipient: "patient" | "reception", status: CreatedAppointment["notification"]) {
  const name = recipient === "patient" ? "Patient confirmation" : "Reception notification";
  if (status === "sent") return `${name} sent by SMTP.`;
  if (status === "failed") return `Appointment saved, but the ${recipient} email could not be sent.`;
  if (status === "not_configured") return `${name} not sent: SMTP${recipient === "reception" ? " or reception email" : ""} is not configured in this app environment.`;
  return "No patient confirmation email was requested.";
}

function Value({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[9px] text-[#81939e]">{label}</p><p className="mt-1 truncate text-[11px] font-medium text-[#29485c]">{value}</p></div>;
}
