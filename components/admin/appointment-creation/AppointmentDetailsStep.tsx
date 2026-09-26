"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarDays, Clock3, LoaderCircle, UserRound } from "lucide-react";
import type { Slot } from "@/lib/slots";
import { CLINIC_TZ, SESSION_MINUTES } from "@/lib/tz";
import { PHONE_COUNTRIES } from "@/lib/phone";
import type { AppointmentDraft, PatientChoice } from "./types";

export interface Physio {
  id: string;
  full_name: string;
  specialisation: string | null;
}

const today = () => format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd");

export function AppointmentDetailsStep({
  patient,
  draft,
  physios,
  physioError,
  availabilityRequest,
  onDraftChange,
  onChangePatient,
  onPatientPhoneChange,
}: {
  patient: PatientChoice;
  draft: AppointmentDraft;
  physios: Physio[] | null;
  physioError: boolean;
  availabilityRequest: number;
  onDraftChange: (draft: AppointmentDraft) => void;
  onChangePatient: () => void;
  onPatientPhoneChange: (phone: string) => void;
}) {
  const [availability, setAvailability] = useState<{ key: string; slots: Slot[]; error: boolean } | null>(null);
  const patientId = patient.kind === "existing" ? patient.patient.id : "";
  const patientName = patient.kind === "existing" ? patient.patient.full_name ?? patient.patient.email : `${patient.firstName} ${patient.lastName}`;
  const patientEmail = patient.kind === "existing" ? patient.patient.email : patient.email;
  const key = `${draft.physioId}:${draft.date}:${patientId}`;
  const slots = availability?.key === key ? availability.slots : null;

  useEffect(() => {
    if (!draft.physioId || !draft.date) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ physioId: draft.physioId, date: draft.date });
    if (patientId) params.set("patientId", patientId);
    fetch(`/api/admin/appointments/availability?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => { if (!controller.signal.aborted) setAvailability({ key, slots: data.slots ?? [], error: false }); })
      .catch(() => { if (!controller.signal.aborted) setAvailability({ key, slots: [], error: true }); });
    return () => controller.abort();
  }, [draft.physioId, draft.date, patientId, key, availabilityRequest]);

  function update<K extends keyof AppointmentDraft>(field: K, value: AppointmentDraft[K]) {
    onDraftChange({ ...draft, [field]: value });
  }

  const patientKind = patient.kind === "existing" ? "Existing patient" : "New patient";
  const orderedSlots = slots ?? [];
  const groups = [
    { label: "Morning", matches: (slot: Slot) => Number(slot.label.slice(0, 2)) < 12 },
    { label: "Noon", matches: (slot: Slot) => Number(slot.label.slice(0, 2)) >= 12 && Number(slot.label.slice(0, 2)) < 14 },
    { label: "Afternoon", matches: (slot: Slot) => Number(slot.label.slice(0, 2)) >= 14 },
  ];

  return (
    <section aria-labelledby="appointment-details-heading" className="space-y-4">
      <div><h2 id="appointment-details-heading" className="text-[17px] font-bold text-[#19364c]">Appointment Details</h2><p className="mt-1 text-[12px] text-[#718596]">Select the physiotherapist, date and available time.</p></div>

      <div className="flex items-center gap-3 rounded-[8px] border border-[#e3e9ed] bg-[#fafcfc] p-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e6f3f2] text-[#107f7b]"><UserRound className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#19364c]">{patientName}</span><span className="block truncate text-[10px] text-[#718596]">{patientEmail} · {draft.phone || "No phone"}</span><span className="mt-0.5 block text-[9px] font-medium text-[#81939e]">{patientKind}</span></div>
        <button type="button" onClick={onChangePatient} className="min-h-10 shrink-0 rounded-[6px] px-2 text-[10px] font-semibold text-[#107f7b] hover:bg-[#edf7f5]">Change Patient</button>
      </div>

      <div className="space-y-1.5"><label htmlFor="appointment-physio" className="text-[11px] font-semibold text-[#38566b]">Physiotherapist <span className="text-[#b33c38]" aria-hidden="true">*</span></label><select id="appointment-physio" required value={draft.physioId} onChange={(event) => onDraftChange({ ...draft, physioId: event.target.value, startUtc: "" })} className="h-11 w-full rounded-[8px] border border-[#dce5e9] bg-white px-3 text-[12px] text-[#19364c] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]"><option value="">Select a physiotherapist</option>{physios?.map((physio) => <option key={physio.id} value={physio.id}>{physio.full_name}{physio.specialisation ? ` · ${physio.specialisation}` : ""}</option>)}</select>{physios === null && !physioError && <p role="status" className="text-[10px] text-[#718596]">Loading physiotherapists…</p>}{physioError && <p role="alert" className="text-[10px] text-[#b33c38]">Couldn’t load physiotherapists. Close and reopen to try again.</p>}</div>

      <div className="space-y-1.5"><label htmlFor="appointment-date" className="text-[11px] font-semibold text-[#38566b]">Appointment Date <span className="text-[#b33c38]" aria-hidden="true">*</span></label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#81939e]" aria-hidden="true" /><input id="appointment-date" type="date" required min={today()} value={draft.date} onChange={(event) => onDraftChange({ ...draft, date: event.target.value, startUtc: "" })} className="h-11 w-full rounded-[8px] border border-[#dce5e9] bg-white pl-10 pr-3 text-[12px] text-[#19364c] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]" /></div><p className="text-[10px] text-[#81939e]">Clinic timezone: {CLINIC_TZ}</p></div>

      <fieldset className="space-y-2"><legend className="text-[11px] font-semibold text-[#38566b]">Available Time <span className="text-[#b33c38]" aria-hidden="true">*</span></legend>{!draft.physioId ? <p className="rounded-[7px] bg-[#f6f8f9] px-3 py-3 text-[11px] text-[#718596]">Select a physiotherapist to view available times.</p> : slots === null ? <p role="status" className="flex items-center gap-2 rounded-[7px] bg-[#f6f8f9] px-3 py-3 text-[11px] text-[#718596]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Loading available times…</p> : availability?.error ? <p role="alert" className="rounded-[7px] bg-[#fff3f1] px-3 py-3 text-[11px] text-[#b33c38]">Couldn’t load available times. Change the date to try again.</p> : orderedSlots.length === 0 ? <p className="rounded-[7px] bg-[#f6f8f9] px-3 py-3 text-[11px] text-[#718596]">No times available on this day.</p> : <div className="space-y-3">{groups.map((group) => { const groupSlots = orderedSlots.filter(group.matches); return groupSlots.length ? <div key={group.label}><p className="mb-1.5 text-[10px] font-semibold text-[#81939e]">{group.label}</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{groupSlots.map((slot) => { const selected = draft.startUtc === slot.startUtc; return <button key={slot.startUtc} type="button" aria-pressed={selected} aria-label={`${slot.label}, ${SESSION_MINUTES} minutes`} onClick={() => update("startUtc", slot.startUtc)} className={`min-h-11 rounded-[7px] border px-2 text-[11px] font-semibold tabular-nums transition-colors ${selected ? "border-[#107f7b] bg-[#107f7b] text-white" : "border-[#dce5e9] bg-white text-[#29485c] hover:border-[#9fc9c5] hover:bg-[#f1f9f7]"}`}><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden="true" />{slot.label}</span></button>; })}</div></div> : null; })}</div>}</fieldset>

      <div className="space-y-1.5"><label htmlFor="appointment-phone" className="text-[11px] font-semibold text-[#38566b]">Phone Number <span className="text-[#b33c38]" aria-hidden="true">*</span></label><div className="grid grid-cols-[minmax(138px,0.75fr)_minmax(0,1.25fr)] gap-2"><select aria-label="Phone country calling code" value={draft.phoneCountry} onChange={(event) => update("phoneCountry", event.target.value)} className="h-11 min-w-0 rounded-[8px] border border-[#dce5e9] bg-white px-2 text-[10px] text-[#29485c] outline-none focus-visible:ring-2 focus-visible:ring-[#b9ddda]">{PHONE_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name} {item.callingCode}</option>)}</select><input id="appointment-phone" type="tel" required minLength={6} maxLength={24} value={draft.phone} onChange={(event) => { update("phone", event.target.value); onPatientPhoneChange(event.target.value); }} autoComplete="tel" className="h-11 w-full min-w-0 rounded-[8px] border border-[#dce5e9] px-3 text-[12px] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]" /></div></div>

      <div className="space-y-1.5"><label htmlFor="appointment-reason" className="text-[11px] font-semibold text-[#38566b]">Reason for Visit <span className="text-[#b33c38]" aria-hidden="true">*</span></label><input id="appointment-reason" required maxLength={500} value={draft.reasonForVisit} onChange={(event) => update("reasonForVisit", event.target.value)} className="h-11 w-full rounded-[8px] border border-[#dce5e9] px-3 text-[12px] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]" /></div>

      <div className="space-y-1.5"><label htmlFor="appointment-comments" className="text-[11px] font-semibold text-[#38566b]">Comments for the Physiotherapist</label><textarea id="appointment-comments" maxLength={500} rows={3} value={draft.commentsForPhysiotherapist} onChange={(event) => update("commentsForPhysiotherapist", event.target.value)} className="w-full resize-y rounded-[8px] border border-[#dce5e9] px-3 py-2 text-[12px] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]" /><p className="text-right text-[10px] tabular-nums text-[#81939e]">{draft.commentsForPhysiotherapist.length} / 500</p></div>

      <label className="flex min-h-11 items-center gap-2 rounded-[7px] border border-[#e3e9ed] px-3 text-[11px] text-[#536c7b]"><input type="checkbox" checked={draft.sendConfirmation} onChange={(event) => update("sendConfirmation", event.target.checked)} className="h-4 w-4 accent-[#107f7b]" />Send Patient Confirmation</label>
    </section>
  );
}
