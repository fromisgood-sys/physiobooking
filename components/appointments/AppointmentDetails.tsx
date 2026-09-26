"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarDays, Check, Clipboard, Clock3, MessageSquareText, ShieldCheck, Trash2, type LucideIcon, X } from "lucide-react";
import { CLINIC_TZ, SESSION_MINUTES } from "@/lib/tz";
import { StatusBadge } from "./StatusBadge";
import { PatientRescheduleSheet } from "./PatientRescheduleSheet";
import { CancelDialog } from "./CancelDialog";
import { BookingDetailsDialog } from "./BookingDetailsDialog";
import type { AppointmentRow } from "./AppointmentCard";

export function AppointmentDetails({
  appointment,
  phoneNumber,
  onChanged,
  onClose,
}: {
  appointment: AppointmentRow;
  phoneNumber: string;
  onChanged: () => void;
  onClose?: () => void;
}) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneUpdateWarning, setPhoneUpdateWarning] = useState(false);
  const rescheduleButton = useRef<HTMLButtonElement>(null);
  const physio = appointment.physiotherapists;
  const start = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
  const end = toZonedTime(new Date(appointment.ends_at), CLINIC_TZ);
  const canManage = ["confirmed", "rescheduled"].includes(appointment.status) && new Date(appointment.ends_at) > new Date();
  const initials = physio?.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "PT";

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(appointment.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="appointment-details-title" className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-[#e5ecef] px-4 py-4 sm:px-5">
        <h2 id="appointment-details-title" className="text-[16px] font-bold text-[#18344b]">Appointment Details</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close appointment details" className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[#617587] hover:bg-[#f2f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79c6c6]">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5">
        <div className="pt-4">
          <StatusBadge status={appointment.status} />
        </div>

        <div className="mt-3">
          <p className="text-[11px] text-[#718596]">Booking Reference</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <p className="font-mono text-[14px] font-semibold text-[#28465c]">{appointment.reference}</p>
            <button type="button" onClick={copyReference} aria-label="Copy booking reference" className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#557184] hover:bg-[#eff7f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79c6c6]">
              {copied ? <Check className="h-4 w-4 text-[#138186]" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
            </button>
            <span aria-live="polite" className="text-[11px] text-[#138186]">{copied ? "Copied" : ""}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {physio?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={physio.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f5f5] text-[13px] font-semibold text-[#147d82]">{initials}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#18344b]">{physio?.full_name ?? "Physiotherapist"}</p>
            {physio?.specialisation && <p className="mt-0.5 text-[12px] text-[#607688]">{physio.specialisation}</p>}
          </div>
        </div>

        <dl className="mt-4 divide-y divide-[#edf1f3] border-y border-[#edf1f3]">
          <DetailRow icon={CalendarDays} label="Date">{format(start, "EEEE, d MMMM yyyy")}</DetailRow>
          <DetailRow icon={Clock3} label="Time">{format(start, "HH:mm")}–{format(end, "HH:mm")} ({SESSION_MINUTES} min)</DetailRow>
          <DetailRow icon={ShieldCheck} label="Status"><StatusBadge status={appointment.status} /></DetailRow>
        </dl>

        <div className="mt-4 rounded-[9px] bg-[#f8fafb] p-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#304b60]"><MessageSquareText className="h-4 w-4 text-[#16888b]" aria-hidden="true" />Reason for Visit</div>
          <p className="mt-1.5 text-[12px] leading-[18px] text-[#607688]">{appointment.reason_for_visit?.trim() || "No comments provided."}</p>
        </div>

        {canManage && (
          <>
            <div className="mt-5 border-t border-[#e6ecef] pt-4">
              <h3 className="text-[13px] font-bold text-[#20394e]">Manage Booking</h3>
              <div className="mt-3 space-y-2">
                {physio && (
                  <button ref={rescheduleButton} type="button" onClick={() => setRescheduleOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#d9e6e9] bg-[#f6fbfb] px-3 text-[13px] font-semibold text-[#147d82] hover:bg-[#eaf6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79c6c6]">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />Reschedule Appointment
                  </button>
                )}
                <button type="button" onClick={() => setUpdateOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dfe7eb] bg-white px-3 text-[13px] font-semibold text-[#36576d] hover:bg-[#f7fafb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79c6c6]">
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />Update Booking Details
                </button>
                <button type="button" onClick={() => setCancelOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#f0dddd] bg-[#fffafa] px-3 text-[13px] font-semibold text-[#b33d37] hover:bg-[#fff2f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dca7a3]">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />Cancel Appointment
                </button>
              </div>
            </div>
            {phoneUpdateWarning && <p role="status" className="mt-3 rounded-[8px] bg-[#fff8e8] px-3 py-2 text-[11px] leading-4 text-[#815b18]">The appointment was rescheduled, but your cellphone number could not be saved. Please update it from booking details.</p>}
            <div className="mt-4 rounded-[9px] border border-[#e4eaed] bg-[#f7f9fa] p-3">
              <p className="text-[12px] font-semibold text-[#304b60]">Need help?</p>
              <p className="mt-1 text-[11px] leading-[17px] text-[#697f90]">Please contact clinic reception if you have questions about your appointment.</p>
            </div>
          </>
        )}
      </div>

      {canManage && (
        <>
          {rescheduleOpen && (
            <PatientRescheduleSheet
              key={appointment.id}
              appointment={appointment}
              phoneNumber={phoneNumber}
              onClose={() => {
                setRescheduleOpen(false);
                window.requestAnimationFrame(() => rescheduleButton.current?.focus());
              }}
              onRescheduled={(phoneUpdated) => {
                setRescheduleOpen(false);
                setPhoneUpdateWarning(!phoneUpdated);
                window.requestAnimationFrame(() => rescheduleButton.current?.focus());
                onChanged();
              }}
            />
          )}
          <BookingDetailsDialog key={appointment.id} appointment={appointment} phoneNumber={phoneNumber} open={updateOpen} onOpenChange={setUpdateOpen} onSaved={() => { setUpdateOpen(false); onChanged(); }} />
          <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} appointmentId={appointment.id} onCancelled={() => { setCancelOpen(false); onChanged(); }} />
        </>
      )}
    </section>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-start gap-3 py-2.5">
      <dt className="flex w-[92px] shrink-0 items-center gap-2 text-[11px] font-medium text-[#697f90]">
        <Icon className="h-4 w-4 text-[#16888b]" aria-hidden="true" />{label}
      </dt>
      <dd className="min-w-0 pt-0.5 text-[12px] font-medium leading-5 text-[#304b60]">{children}</dd>
    </div>
  );
}