"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { countryForPhone, isValidInternationalPhone, normalizeAdminPhone } from "@/lib/phone";
import { CLINIC_TZ } from "@/lib/tz";
import { AppointmentDetailsStep } from "./AppointmentDetailsStep";
import { AppointmentReviewStep } from "./AppointmentReviewStep";
import { AppointmentSuccessState } from "./AppointmentSuccessState";
import { PatientSelectionStep } from "./PatientSelectionStep";
import type { AppointmentDraft, CreatedAppointment, NewPatientDraft, PatientChoice } from "./types";

const emptyNewPatient: NewPatientDraft = { firstName: "", lastName: "", email: "", countryCode: "NA", phone: "" };
const today = () => format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd");
const emptyAppointment = (): AppointmentDraft => ({ physioId: "", date: today(), startUtc: "", phone: "", phoneCountry: "NA", reasonForVisit: "", commentsForPhysiotherapist: "", sendConfirmation: true });

export function CreateAppointmentSheet({
  open,
  onOpenChange,
  onCreated,
  onViewAppointment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (appointment: CreatedAppointment) => void;
  onViewAppointment: (appointment: CreatedAppointment) => void;
}) {
  const [step, setStep] = useState(1);
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [patient, setPatient] = useState<PatientChoice | null>(null);
  const [newPatient, setNewPatient] = useState<NewPatientDraft>(emptyNewPatient);
  const [newPatientReady, setNewPatientReady] = useState(false);
  const [patientCheckVersion, setPatientCheckVersion] = useState(0);
  const [appointment, setAppointment] = useState<AppointmentDraft>(emptyAppointment);
  const [availabilityRequest, setAvailabilityRequest] = useState(0);
  const [physios, setPhysios] = useState<Array<{ id: string; full_name: string; specialisation: string | null }> | null>(null);
  const [physioError, setPhysioError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAppointment | null>(null);
  const dirty = Boolean(patient || newPatient.firstName || newPatient.lastName || newPatient.email || newPatient.phone || appointment.physioId || appointment.startUtc || appointment.reasonForVisit || appointment.commentsForPhysiotherapist);
  const selectedPhysio = physios?.find((physio) => physio.id === appointment.physioId) ?? null;

  const handleNewPatientReady = useCallback((ready: boolean) => setNewPatientReady(ready), []);

  useEffect(() => {
    if (!open || physios) return;
    let cancelled = false;
    fetch("/api/admin/physiotherapists")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => { if (!cancelled) setPhysios((data.physiotherapists ?? []).filter((physio: { is_active: boolean }) => physio.is_active)); })
      .catch(() => { if (!cancelled) setPhysioError(true); });
    return () => { cancelled = true; };
  }, [open, physios]);

  function clearState() {
    setStep(1);
    setPatientMode("existing");
    setPatient(null);
    setNewPatient(emptyNewPatient);
    setNewPatientReady(false);
    setPatientCheckVersion(0);
    setAppointment(emptyAppointment());
    setAvailabilityRequest(0);
    setSubmitting(false);
    setError(null);
    setCreated(null);
  }

  function requestClose() {
    if (submitting) return;
    if (!created && dirty && !window.confirm("Discard this appointment? Your unsaved information will be lost.")) return;
    clearState();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) requestClose();
  }

  function selectPatient(next: PatientChoice | null) {
    setPatient(next);
    const phone = next?.kind === "existing" ? next.patient.phone ?? "" : next?.phone ?? "";
    const normalizedPhone = phone.startsWith("+") ? phone : normalizeAdminPhone("NA", phone);
    setAppointment((current) => ({ ...current, phone: normalizedPhone || phone, phoneCountry: countryForPhone(phone) }));
  }

  function updateAppointmentDraft(next: AppointmentDraft) {
    if (next.startUtc !== appointment.startUtc) setError(null);
    setAppointment(next);
  }

  function continueFromPatient() {
    setError(null);
    if (patientMode === "existing") {
      if (patient?.kind !== "existing") return;
    } else {
      const phone = normalizeAdminPhone(newPatient.countryCode, newPatient.phone);
      if (!newPatientReady || !phone) return;
      setPatient({ kind: "new", firstName: newPatient.firstName.trim(), lastName: newPatient.lastName.trim(), email: newPatient.email.trim().toLowerCase(), phone });
      setAppointment((current) => ({ ...current, phone: newPatient.phone, phoneCountry: newPatient.countryCode }));
    }
    setStep(2);
  }

  function canContinueFromAppointment() {
    return Boolean(appointment.physioId && appointment.date >= today() && appointment.startUtc && isValidInternationalPhone(normalizeAdminPhone(appointment.phoneCountry, appointment.phone)) && appointment.reasonForVisit.trim());
  }

  async function createAppointment() {
    if (submitting || !patient || !selectedPhysio || !canContinueFromAppointment()) return;
    setSubmitting(true);
    setError(null);
    const normalizedPhone = normalizeAdminPhone(appointment.phoneCountry, appointment.phone);
    const patientPayload = patient.kind === "existing"
      ? { kind: "existing", patientId: patient.patient.id, phone: normalizedPhone }
      : { kind: "new", firstName: patient.firstName, lastName: patient.lastName, email: patient.email, phone: normalizedPhone };
    try {
      const response = await fetch("/api/admin/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          patient: patientPayload,
          physioId: appointment.physioId,
          startUtc: appointment.startUtc,
          phone: normalizedPhone,
          reasonForVisit: appointment.reasonForVisit,
          commentsForPhysiotherapist: appointment.commentsForPhysiotherapist,
          sendConfirmation: appointment.sendConfirmation,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not create the appointment.");
        if (response.status === 409 && data.patients?.length) {
          setPatient(null);
          setPatientMode("new");
          setNewPatientReady(false);
          setPatientCheckVersion((value) => value + 1);
          setStep(1);
        }
        if (response.status === 409 && data.error?.includes("no longer available")) {
          setStep(2);
          setAvailabilityRequest((value) => value + 1);
          setAppointment((current) => ({ ...current, startUtc: "" }));
        }
        setSubmitting(false);
        return;
      }
      setCreated(data as CreatedAppointment);
      setStep(4);
      onCreated(data as CreatedAppointment);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  function createAnother() {
    clearState();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="!fixed !inset-y-0 !right-0 !left-auto !top-0 !h-dvh !max-h-dvh !w-full !max-w-none !translate-x-0 !translate-y-0 !grid-rows-[auto_auto_minmax(0,1fr)_auto] !gap-0 !overflow-hidden !rounded-none !border-l !border-[#dce5e9] !bg-white !p-0 !text-[#19364c] !shadow-[-8px_0_28px_rgba(25,53,70,0.12)] !outline-none duration-200 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right sm:!w-[min(600px,75vw)]">
        <header className="border-b border-[#e3e9ed] bg-white px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-4"><div><DialogTitle className="text-[17px] font-bold leading-6 text-[#19364c]">Create Appointment</DialogTitle><DialogDescription className="mt-1 text-[11px] text-[#718596]">Book a new appointment for a patient.</DialogDescription></div><button type="button" onClick={requestClose} aria-label="Close create appointment" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[7px] text-[#536c7b] hover:bg-[#f3f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fc2bd]"><X className="h-5 w-5" aria-hidden="true" /></button></div>
        </header>

        <ol aria-label="Appointment creation steps" className="grid grid-cols-3 border-b border-[#e3e9ed] px-4 py-3 sm:px-6">
          {["Patient", "Appointment Details", "Review & Confirm"].map((label, index) => { const indexStep = index + 1; const completed = step > indexStep; const active = step === indexStep; return <li key={label} aria-current={active ? "step" : undefined} className="flex min-w-0 items-center gap-1.5 text-[9px] sm:gap-2 sm:text-[10px]"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${completed ? "border-[#107f7b] bg-[#107f7b] text-white" : active ? "border-[#107f7b] bg-[#107f7b] text-white" : "border-[#d9e2e6] bg-white text-[#718596]"}`}>{completed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : indexStep}</span><span className={`min-w-0 truncate ${active || completed ? "font-semibold text-[#107f7b]" : "text-[#81939e]"}`}>{label}</span>{indexStep < 3 && <span className="ml-auto hidden h-px w-4 bg-[#dce5e9] sm:block" aria-hidden="true" />}</li>; })}
        </ol>

        <div key={step} className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6" aria-live="off">
          <p className="sr-only" aria-live="polite">{step === 1 ? "Step 1: Patient" : step === 2 ? "Step 2: Appointment Details" : step === 3 ? "Step 3: Review and Confirm" : "Appointment created"}</p>
          {step === 1 && <PatientSelectionStep key={patientCheckVersion} mode={patientMode} onModeChange={setPatientMode} patient={patient} onPatientChange={selectPatient} draft={newPatient} onDraftChange={setNewPatient} onNewPatientReady={handleNewPatientReady} />}
          {step === 2 && patient && <AppointmentDetailsStep patient={patient} draft={appointment} physios={physios} physioError={physioError} availabilityRequest={availabilityRequest} onDraftChange={updateAppointmentDraft} onChangePatient={() => setStep(1)} onPatientPhoneChange={(phone) => setPatient((current) => current?.kind === "new" ? { ...current, phone } : current)} />}
          {step === 3 && patient && selectedPhysio && <AppointmentReviewStep patient={patient} draft={{ ...appointment, phone: normalizeAdminPhone(appointment.phoneCountry, appointment.phone) }} physio={selectedPhysio} onEditPatient={() => setStep(1)} onEditAppointment={() => setStep(2)} />}
          {step === 4 && created && <AppointmentSuccessState appointment={created} onView={() => { const result = created; clearState(); onViewAppointment(result); }} onCreateAnother={createAnother} onClose={requestClose} />}
          {error && step < 4 && <p role="alert" className="mt-4 rounded-[7px] border border-[#f0c9c5] bg-[#fff4f2] px-3 py-2.5 text-[11px] text-[#a93230]">{error}</p>}
        </div>

        {step < 4 && <footer className="flex items-center justify-between gap-3 border-t border-[#e3e9ed] bg-white px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          {step === 1 ? <><button type="button" onClick={requestClose} className="min-h-11 min-w-[112px] rounded-[7px] border border-[#dce5e9] px-4 text-[11px] font-semibold text-[#536c7b] hover:bg-[#f6f8f9]">Cancel</button><button type="button" disabled={patientMode === "existing" ? patient?.kind !== "existing" : !newPatientReady} onClick={continueFromPatient} className="flex min-h-11 min-w-[112px] items-center justify-center gap-2 rounded-[7px] bg-[#107f7b] px-4 text-[11px] font-semibold text-white hover:bg-[#096965] disabled:cursor-not-allowed disabled:opacity-45">Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button></> : step === 2 ? <><button type="button" onClick={() => { setError(null); setStep(1); }} className="flex min-h-11 min-w-[112px] items-center justify-center gap-2 rounded-[7px] border border-[#dce5e9] px-4 text-[11px] font-semibold text-[#536c7b] hover:bg-[#f6f8f9]"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back</button><button type="button" disabled={!canContinueFromAppointment()} onClick={() => { setError(null); setStep(3); }} className="flex min-h-11 min-w-[112px] items-center justify-center gap-2 rounded-[7px] bg-[#107f7b] px-4 text-[11px] font-semibold text-white hover:bg-[#096965] disabled:cursor-not-allowed disabled:opacity-45">Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button></> : <><button type="button" onClick={() => { setError(null); setStep(2); }} disabled={submitting} className="flex min-h-11 min-w-[112px] items-center justify-center gap-2 rounded-[7px] border border-[#dce5e9] px-4 text-[11px] font-semibold text-[#536c7b] hover:bg-[#f6f8f9] disabled:opacity-45"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back</button><button type="button" disabled={submitting || !patient || !selectedPhysio} onClick={createAppointment} className="flex min-h-11 min-w-[160px] items-center justify-center gap-2 rounded-[7px] bg-[#107f7b] px-4 text-[11px] font-semibold text-white hover:bg-[#096965] disabled:cursor-not-allowed disabled:opacity-45">{submitting ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Creating…</> : <>Create Appointment <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /></>}</button></>}
        </footer>}
      </DialogContent>
    </Dialog>
  );
}

