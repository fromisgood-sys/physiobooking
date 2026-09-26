"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarDays, CheckCircle2, Clock3, Mail, UserRound } from "lucide-react";
import { CLINIC_TZ } from "@/lib/tz";
import type { AppointmentDraft, PatientChoice } from "./types";

export function AppointmentReviewStep({ patient, draft, physio, onEditPatient, onEditAppointment }: {
  patient: PatientChoice;
  draft: AppointmentDraft;
  physio: { id: string; full_name: string; specialisation: string | null };
  onEditPatient: () => void;
  onEditAppointment: () => void;
}) {
  const start = toZonedTime(new Date(draft.startUtc), CLINIC_TZ);
  const end = new Date(start.getTime() + 45 * 60_000);
  const isNewPatient = patient.kind === "new";
  const name = isNewPatient ? `${patient.firstName} ${patient.lastName}` : patient.patient.full_name ?? patient.patient.email;
  const email = isNewPatient ? patient.email : patient.patient.email;

  return (
    <section aria-labelledby="review-step-heading" className="space-y-4">
      <div><h2 id="review-step-heading" className="text-[17px] font-bold text-[#19364c]">Review &amp; Confirm</h2><p className="mt-1 text-[12px] text-[#718596]">Review the appointment details before creating the booking.</p></div>
      <section className="rounded-[8px] border border-[#e3e9ed] p-3.5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#148b86]" aria-hidden="true" /><h3 className="text-[12px] font-bold text-[#19364c]">Patient</h3></div><button type="button" onClick={onEditPatient} className="min-h-10 px-2 text-[10px] font-semibold text-[#107f7b]">Edit Patient</button></div><span className="mt-2 inline-block rounded-[4px] bg-[#eef6f5] px-2 py-1 text-[9px] font-semibold text-[#107f7b]">{isNewPatient ? "New patient" : "Existing patient"}</span><p className="mt-2 text-[13px] font-semibold text-[#19364c]">{name}</p><p className="mt-1 text-[11px] text-[#617988]">{email}</p><p className="mt-0.5 text-[11px] text-[#617988]">{draft.phone}</p></section>
      <section className="rounded-[8px] border border-[#e3e9ed] p-3.5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#148b86]" aria-hidden="true" /><h3 className="text-[12px] font-bold text-[#19364c]">Appointment</h3></div><button type="button" onClick={onEditAppointment} className="min-h-10 px-2 text-[10px] font-semibold text-[#107f7b]">Edit Appointment Details</button></div><p className="mt-2 text-[13px] font-semibold text-[#19364c]">{physio.full_name}</p>{physio.specialisation && <p className="text-[11px] text-[#617988]">{physio.specialisation}</p>}<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3"><ReviewValue label="Date" value={format(start, "EEE d MMM yyyy")} /><ReviewValue label="Start" value={format(start, "HH:mm")} /><ReviewValue label="End" value={format(end, "HH:mm")} /><ReviewValue label="Duration" value="45 minutes" /><ReviewValue label="Reason for Visit" value={draft.reasonForVisit} wide />{draft.commentsForPhysiotherapist && <ReviewValue label="Comments" value={draft.commentsForPhysiotherapist} wide />}</div></section>
      <section className="rounded-[8px] border border-[#e3e9ed] p-3.5"><h3 className="flex items-center gap-2 text-[12px] font-bold text-[#19364c]"><Mail className="h-4 w-4 text-[#148b86]" aria-hidden="true" />Notifications</h3><div className="mt-2 space-y-2 text-[11px] text-[#617988]"><p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#148b86]" aria-hidden="true" />Email confirmation {draft.sendConfirmation ? "will be attempted" : "will not be sent"}.</p><p className="flex items-start gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#148b86]" aria-hidden="true" />Google Calendar will be created if the patient has connected their account.</p></div></section>
    </section>
  );
}

function ReviewValue({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "col-span-2" : "min-w-0"}><p className="text-[9px] font-semibold uppercase tracking-[0.04em] text-[#81939e]">{label}</p><p className="mt-1 break-words text-[11px] leading-4 text-[#29485c]">{value}</p></div>;
}
