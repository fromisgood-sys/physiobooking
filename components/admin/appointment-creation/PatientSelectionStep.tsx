"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, LoaderCircle, Plus, Search, UserRound } from "lucide-react";
import { adminNewPatientDetailsSchema, normalizeAdminPhone } from "@/lib/validation";
import { PHONE_COUNTRIES } from "@/lib/phone";
import type { NewPatientDraft, PatientChoice, PatientSummary } from "./types";

function initials(name: string | null) {
  return (name ?? "Patient").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function PatientRow({ patient, selected, onSelect }: { patient: PatientSummary; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`flex min-h-[64px] w-full items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition-colors ${selected ? "border-[#65b9b2] bg-[#f0f9f7]" : "border-[#e3e9ed] hover:border-[#b9d8d6] hover:bg-[#f8fbfb]"}`}>
      {patient.avatar_url ? <img src={patient.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f3f2] text-[12px] font-bold text-[#107f7b]">{initials(patient.full_name)}</span>}
      <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[#19364c]">{patient.full_name ?? patient.email}</span><span className="mt-0.5 block truncate text-[11px] text-[#617988]">{patient.email}</span><span className="block text-[10px] text-[#81939e]">{patient.phone || "No phone number"}</span></span>
      {selected ? <Check className="h-4 w-4 shrink-0 text-[#107f7b]" aria-hidden="true" /> : <span className="shrink-0 rounded-[4px] border border-[#dce6e8] px-1.5 py-0.5 text-[9px] font-semibold text-[#617988]">Existing</span>}
    </button>
  );
}

export function PatientSelectionStep({
  mode,
  onModeChange,
  patient,
  onPatientChange,
  draft,
  onDraftChange,
  onNewPatientReady,
}: {
  mode: "existing" | "new";
  onModeChange: (mode: "existing" | "new") => void;
  patient: PatientChoice | null;
  onPatientChange: (patient: PatientChoice | null) => void;
  draft: NewPatientDraft;
  onDraftChange: (draft: NewPatientDraft) => void;
  onNewPatientReady: (ready: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [searchState, setSearchState] = useState<{ query: string; loading: boolean; error: boolean; patients: PatientSummary[] }>({ query: "", loading: false, error: false, patients: [] });
  const [duplicateState, setDuplicateState] = useState<{ checking: boolean; error: string | null; patients: PatientSummary[] }>({ checking: false, error: null, patients: [] });

  useEffect(() => {
    const query = search.trim();
    if (mode !== "existing" || query.length < 3) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchState({ query, loading: true, error: false, patients: [] });
      try {
        const response = await fetch(`/api/admin/patients/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Search failed");
        setSearchState({ query, loading: false, error: false, patients: data.patients ?? [] });
      } catch {
        if (!controller.signal.aborted) setSearchState({ query, loading: false, error: true, patients: [] });
      }
    }, 350);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [search, mode]);

  const firstName = draft.firstName;
  const lastName = draft.lastName;
  const email = draft.email;
  const countryCode = draft.countryCode;
  const phone = draft.phone;
  const normalizedPhone = normalizeAdminPhone(countryCode, phone);
  const detailsValid = adminNewPatientDetailsSchema.safeParse({ firstName, lastName, email, phone: normalizedPhone }).success;

  useEffect(() => {
    if (mode !== "new" || !detailsValid) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setDuplicateState({ checking: true, error: null, patients: [] });
      onNewPatientReady(false);
      try {
        const response = await fetch("/api/admin/patients/duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, phone: normalizedPhone }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not check for duplicates");
        const patients = (data.patients ?? []) as PatientSummary[];
        setDuplicateState({ checking: false, error: null, patients });
        onNewPatientReady(patients.length === 0);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDuplicateState({ checking: false, error: error instanceof Error ? error.message : "Could not check for duplicates", patients: [] });
          onNewPatientReady(false);
        }
      }
    }, 450);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [mode, detailsValid, firstName, lastName, email, normalizedPhone, onNewPatientReady]);

  function changeMode(nextMode: "existing" | "new") {
    onModeChange(nextMode);
    onPatientChange(null);
    setDuplicateState({ checking: false, error: null, patients: [] });
    onNewPatientReady(false);
  }

  function selectExisting(existing: PatientSummary) {
    setDuplicateState({ checking: false, error: null, patients: [] });
    onNewPatientReady(false);
    onPatientChange({ kind: "existing", patient: existing });
    onModeChange("existing");
  }

  function updateDraft<K extends keyof NewPatientDraft>(key: K, value: NewPatientDraft[K]) {
    onPatientChange(null);
    setDuplicateState({ checking: false, error: null, patients: [] });
    onNewPatientReady(false);
    onDraftChange({ ...draft, [key]: value });
  }

  return (
    <section aria-labelledby="patient-step-heading" className="space-y-4">
      <div><h2 id="patient-step-heading" className="text-[17px] font-bold text-[#19364c]">Select Patient</h2><p className="mt-1 text-[12px] text-[#718596]">Search for an existing patient or add a new one.</p></div>

      <div role="tablist" aria-label="Patient type" className="flex border-b border-[#e3e9ed]">
        {(["existing", "new"] as const).map((item) => <button key={item} id={`patient-tab-${item}`} type="button" role="tab" aria-selected={mode === item} aria-controls="patient-tab-panel" onClick={() => changeMode(item)} className={`min-h-11 border-b-2 px-4 text-[12px] font-semibold ${mode === item ? "border-[#148b86] text-[#107f7b]" : "border-transparent text-[#718596] hover:text-[#29485c]"}`}>{item === "existing" ? "Existing Patient" : "New Patient"}</button>)}
      </div>

      <div id="patient-tab-panel" role="tabpanel" aria-labelledby={`patient-tab-${mode}`} className="space-y-3">
        {mode === "existing" ? <>
          <label htmlFor="patient-search" className="sr-only">Search patients by name, email or phone</label>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#81939e]" aria-hidden="true" /><input id="patient-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); onPatientChange(null); }} placeholder="Search by name, email or phone..." autoComplete="off" className="h-11 w-full rounded-[8px] border border-[#dce5e9] bg-white pl-10 pr-3 text-[12px] text-[#19364c] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]" /></div>
          <div aria-live="polite" className="min-h-5 text-[11px] text-[#718596]">{search.trim().length < 3 ? "Enter at least 3 characters to search." : searchState.query !== search.trim() || searchState.loading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Searching patients…</span> : searchState.error ? <span role="alert" className="text-[#b33c38]">Patient search failed. Try again.</span> : searchState.patients.length === 0 ? "No matching patient found." : `${searchState.patients.length} matching patient${searchState.patients.length === 1 ? "" : "s"}.`}</div>
          {searchState.query === search.trim() && searchState.patients.length > 0 && <div className="space-y-2">{searchState.patients.map((item) => <PatientRow key={item.id} patient={item} selected={patient?.kind === "existing" && patient.patient.id === item.id} onSelect={() => selectExisting(item)} />)}</div>}
          {patient?.kind === "existing" && <div className="rounded-[8px] border border-[#c6e3df] bg-[#f1f9f7] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#107f7b]">Selected patient</p><p className="mt-1 text-[13px] font-semibold text-[#19364c]">{patient.patient.full_name ?? patient.patient.email}</p><p className="text-[11px] text-[#617988]">{patient.patient.email} · {patient.patient.phone || "No phone"}</p></div>}
          <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#e8edef] px-3 py-2.5"><p className="text-[11px] text-[#718596]">No matching patient?</p><button type="button" onClick={() => changeMode("new")} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-[7px] border border-[#cddfdc] px-3 text-[11px] font-semibold text-[#107f7b] hover:bg-[#f1f9f7]"><Plus className="h-3.5 w-3.5" aria-hidden="true" />Add New Patient</button></div>
        </> : <>
          <div><h3 className="text-[14px] font-bold text-[#19364c]">New Patient</h3><p className="mt-1 text-[11px] text-[#718596]">Enter the patient’s details to create a new patient profile.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <TextField id="new-first-name" label="First Name" required value={draft.firstName} onChange={(value) => updateDraft("firstName", value)} error={draft.firstName.length > 0 && !draft.firstName.trim() ? "Enter a first name." : undefined} />
            <TextField id="new-last-name" label="Last Name" required value={draft.lastName} onChange={(value) => updateDraft("lastName", value)} error={draft.lastName.length > 0 && !draft.lastName.trim() ? "Enter a last name." : undefined} />
          </div>
          <TextField id="new-email" label="Email Address" type="email" required value={draft.email} onChange={(value) => updateDraft("email", value)} error={draft.email.length > 0 && !zEmail(draft.email) ? "Enter a valid email address." : undefined} />
          <div className="space-y-1.5"><label htmlFor="new-phone" className="text-[11px] font-semibold text-[#38566b]">Phone Number <span className="text-[#b33c38]" aria-hidden="true">*</span></label><div className="grid grid-cols-[minmax(128px,0.72fr)_minmax(0,1.28fr)] gap-2"><select aria-label="Country calling code" value={draft.countryCode} onChange={(event) => updateDraft("countryCode", event.target.value)} className="h-11 min-w-0 rounded-[8px] border border-[#dce5e9] bg-white px-2 text-[10px] text-[#29485c] outline-none focus-visible:ring-2 focus-visible:ring-[#b9ddda]">{PHONE_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name} {item.callingCode}</option>)}</select><input id="new-phone" type="tel" required autoComplete="tel-national" value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} className="h-11 min-w-0 rounded-[8px] border border-[#dce5e9] px-3 text-[12px] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]" placeholder="81 234 5678" /></div></div>
          <div className="rounded-[8px] border border-[#dce9e7] bg-[#f6faf9] p-3"><div className="flex gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#148b86]" aria-hidden="true" /><p className="text-[11px] leading-5 text-[#536c7b]">The patient profile will be created now. The patient can later sign in using the same email address with Google to manage the appointment.</p></div></div>
          {duplicateState.checking && <p aria-live="polite" className="flex items-center gap-2 text-[11px] text-[#718596]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Checking for an existing patient…</p>}
          {duplicateState.error && <p role="alert" className="flex items-center gap-2 text-[11px] text-[#b33c38]"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{duplicateState.error}</p>}
          {duplicateState.patients.length > 0 && <div className="space-y-2 rounded-[8px] border border-[#ecd8ad] bg-[#fffaf0] p-3"><p className="text-[11px] font-semibold text-[#815b19]">A matching patient may already exist. Select the existing profile to continue.</p>{duplicateState.patients.map((item) => <PatientRow key={item.id} patient={item} selected={false} onSelect={() => selectExisting(item)} />)}</div>}
        </>}
      </div>
    </section>
  );
}

function TextField({ id, label, required, type = "text", value, onChange, error }: { id: string; label: string; required?: boolean; type?: string; value: string; onChange: (value: string) => void; error?: string }) {
  return <div className="min-w-0 space-y-1.5"><label htmlFor={id} className="text-[11px] font-semibold text-[#38566b]">{label}{required && <span className="ml-1 text-[#b33c38]" aria-hidden="true">*</span>}</label><input id={id} type={type} required={required} autoComplete={id === "new-first-name" ? "given-name" : id === "new-last-name" ? "family-name" : type === "email" ? "email" : undefined} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="h-11 w-full rounded-[8px] border border-[#dce5e9] bg-white px-3 text-[12px] text-[#19364c] outline-none focus-visible:border-[#168884] focus-visible:ring-2 focus-visible:ring-[#b9ddda]" />{error && <p id={`${id}-error`} className="text-[10px] text-[#b33c38]">{error}</p>}</div>;
}

function zEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
