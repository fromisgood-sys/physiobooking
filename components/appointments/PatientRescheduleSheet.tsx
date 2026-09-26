"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarDays, Clock3, Info, LockKeyhole, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayStrip } from "@/components/booking/DayStrip";
import { SlotGrid } from "@/components/booking/SlotGrid";
import type { Slot } from "@/lib/slots";
import {
  addDaysToDateLabel,
  allSlotLabels,
  CLINIC_TZ,
  SESSION_MINUTES,
  weekdayOfDateLabel,
} from "@/lib/tz";
import { rescheduleWithDetailsSchema } from "@/lib/validation";
import type { AppointmentRow } from "./AppointmentCard";

const SLOT_LABELS = allSlotLabels();

type AvailabilityState = { key: string; slots: Slot[]; error: boolean };

export function PatientRescheduleSheet({
  appointment,
  phoneNumber,
  onClose,
  onRescheduled,
}: {
  appointment: AppointmentRow;
  phoneNumber: string;
  onClose: () => void;
  onRescheduled: (phoneUpdated: boolean) => void;
}) {
  const physio = appointment.physiotherapists;
  const physioId = physio?.id ?? "";
  const physioName = physio?.full_name ?? "your physiotherapist";
  const [todayLabel] = useState(() => format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd"));
  const firstScheduledDate = Array.from({ length: 30 }, (_, index) => addDaysToDateLabel(todayLabel, index))
    .find((date) => appointment.availableWeekdays.includes(weekdayOfDateLabel(date))) ?? todayLabel;
  const [selectedDate, setSelectedDate] = useState(firstScheduledDate);
  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [requestNumber, setRequestNumber] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [phone, setPhone] = useState(phoneNumber);
  const [comments, setComments] = useState(appointment.reason_for_visit ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = `${physioId}:${selectedDate}:${requestNumber}`;
  const currentAvailability = availability?.key === requestKey ? availability : null;
  const slots = currentAvailability?.slots ?? null;
  const start = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
  const end = toZonedTime(new Date(appointment.ends_at), CLINIC_TZ);
  const hasChanges =
    comments.trim() !== (appointment.reason_for_visit ?? "").trim() ||
    phone.trim() !== phoneNumber.trim() ||
    Boolean(selectedSlot && selectedSlot.startUtc !== appointment.starts_at);
  const parsedPhone = rescheduleWithDetailsSchema.shape.phone.safeParse(phone);
  const phoneError = parsedPhone.success
    ? null
    : parsedPhone.error.issues[0]?.message ?? "Enter a valid cellphone number.";
  const clinicOffset = new Intl.DateTimeFormat("en", {
    timeZone: CLINIC_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value.replace("UTC", "GMT") ?? CLINIC_TZ;

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/availability?physioId=${physioId}&date=${selectedDate}`)
      .then((response) => {
        if (!response.ok) throw new Error("Availability request failed");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setAvailability({ key: requestKey, slots: data.slots ?? [], error: false });
      })
      .catch(() => {
        if (!cancelled) setAvailability({ key: requestKey, slots: [], error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [physioId, selectedDate, requestNumber, requestKey]);

  async function saveChanges() {
    if (!selectedSlot || !hasChanges || submitting || phoneError) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUtc: selectedSlot.startUtc,
          phone,
          reasonForVisit: comments,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setSelectedSlot(null);
          setRequestNumber((current) => current + 1);
          setError("That time is no longer available. Please select another time.");
        } else {
          setError(result.error ?? "Could not reschedule this appointment.");
        }
        setSubmitting(false);
        return;
      }

      onRescheduled(result.phoneUpdated !== false);
    } catch {
      setError("Couldn’t reach the server. Try again.");
      setSubmitting(false);
    }
  }

  function closeSheet() {
    if (hasChanges && !window.confirm("Discard your unsaved rescheduling changes?")) return;
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) closeSheet(); }}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-y-0 !left-auto !right-0 !top-0 !h-dvh !w-full !max-w-[460px] !translate-x-0 !translate-y-0 !flex flex-col gap-0 overflow-hidden rounded-none border-l border-[#e1e8ed] bg-white !p-0 text-[#172f44] shadow-[-12px_0_36px_rgba(17,39,58,0.14)] outline-none duration-300 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right max-sm:!inset-x-0 max-sm:!left-0 max-sm:!right-0 max-sm:!top-auto max-sm:!bottom-0 max-sm:!h-[92dvh] max-sm:rounded-t-[18px] max-sm:rounded-b-none max-sm:border-l-0 max-sm:border-t max-sm:shadow-[0_-12px_36px_rgba(17,39,58,0.16)] max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom"
      >
        <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#c9d3da] sm:hidden" aria-hidden="true" />
        <DialogHeader className="relative shrink-0 border-b border-[#e9eef1] px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
          <DialogTitle className="pr-10 text-[18px] font-bold text-[#172f44]">Reschedule Appointment</DialogTitle>
          <DialogDescription className="mt-1 text-[12px] leading-5 text-[#617587]">Update your appointment details.</DialogDescription>
          <DialogClose
            aria-label="Close reschedule appointment"
            render={<button type="button" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-[8px] text-[#52697b] hover:bg-[#f2f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6] sm:right-5 sm:top-5" />}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <section aria-label="Current appointment" className="rounded-[10px] border border-[#e1e8ed] p-3">
            <div className="flex items-center gap-3">
              {physio?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={physio.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f5f5] text-[12px] font-semibold text-[#147d82]">
                  {physioName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#20394e]">{physioName}</p>
                {physio?.specialisation && <p className="mt-0.5 truncate text-[11px] text-[#687f90]">{physio.specialisation}</p>}
              </div>
            </div>
            <dl className="mt-3 space-y-2 border-t border-[#edf1f3] pt-3 text-[11px] text-[#526a7d]">
              <div className="flex items-center gap-2"><dt className="flex w-[82px] items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[#16888b]" aria-hidden="true" />Date</dt><dd>{format(start, "EEE, d MMM yyyy")}</dd></div>
              <div className="flex items-center gap-2"><dt className="flex w-[82px] items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#16888b]" aria-hidden="true" />Time</dt><dd>{format(start, "HH:mm")}–{format(end, "HH:mm")} ({SESSION_MINUTES} min)</dd></div>
            </dl>
          </section>

          <div role="group" aria-labelledby="reschedule-date-label" className="mt-5">
            <h3 id="reschedule-date-label" className="mb-2 text-[12px] font-semibold text-[#20394e]">New Date <span className="text-[#b33d37" aria-hidden="true">*</span></h3>
            <DayStrip
              todayLabel={todayLabel}
              selectedDate={selectedDate}
              availableWeekdays={appointment.availableWeekdays}
              onSelect={(date) => { setSelectedDate(date); setSelectedSlot(null); setError(null); }}
            />
          </div>

          <h3 className="mt-5 text-[12px] font-semibold text-[#20394e]">New Time <span className="text-[#b33d37" aria-hidden="true">*</span></h3>
          <div className="mt-3">
            {slots === null && <p role="status" className="text-[13px] text-[#617587]">Loading available times…</p>}
            {currentAvailability?.error && (
              <div role="alert" className="flex items-center justify-between gap-2 rounded-[8px] bg-[#fff3f1] px-3 py-2 text-[12px] text-[#a73730]">
                Couldn’t load available times.
                <button type="button" onClick={() => setRequestNumber((current) => current + 1)} className="min-h-9 px-2 font-semibold underline underline-offset-2">Try again</button>
              </div>
            )}
            {slots?.length === 0 && !currentAvailability?.error && <p className="text-[13px] text-[#617587]">No times available on this day.</p>}
            {slots && slots.length > 0 && <SlotGrid allLabels={SLOT_LABELS} slots={slots} selectedLabel={selectedSlot?.label ?? null} onSelect={setSelectedSlot} />}
          </div>
          <p className="mt-2 text-[10px] text-[#718596]">All times are shown in {CLINIC_TZ} ({clinicOffset})</p>

          <label className="mt-5 block text-[12px] font-semibold text-[#20394e]" htmlFor="reschedule-phone">Cellphone Number <span className="text-[#b33d37" aria-hidden="true">*</span></label>
          <input
            id="reschedule-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            minLength={6}
            maxLength={30}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={Boolean(phoneError)}
            aria-describedby={phoneError ? "reschedule-phone-error" : undefined}
            className="mt-2 h-11 w-full rounded-[8px] border border-[#d8e1e7] px-3 text-[13px] text-[#20394e] outline-none focus-visible:ring-2 focus-visible:ring-[#83cece] aria-[invalid=true]:border-[#b33d37]"
          />
          {phoneError && <p id="reschedule-phone-error" className="mt-1 text-[11px] text-[#a73730]">{phoneError}</p>}

          <label className="mt-5 block text-[12px] font-semibold text-[#20394e]" htmlFor="reschedule-comments">Comments for the Physiotherapist</label>
          <textarea
            id="reschedule-comments"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Let us know if there’s anything the physiotherapist should know before your appointment."
            className="mt-2 min-h-[96px] w-full resize-y rounded-[8px] border border-[#d8e1e7] px-3 py-2.5 text-[13px] leading-5 text-[#20394e] outline-none focus-visible:ring-2 focus-visible:ring-[#83cece]"
          />
          <p className="text-right text-[10px] tabular-nums text-[#758899]">{comments.length} / 500</p>

          <div className="mt-3 flex items-start gap-2 rounded-[9px] border border-[#e3eaed] bg-[#f7f9fa] p-3 text-[11px] leading-[17px] text-[#5b7283]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#16888b]" aria-hidden="true" />
            <p>Rescheduling is subject to availability. An updated confirmation will be sent when notification delivery is available.</p>
          </div>
          {error && <p role="alert" className="mt-3 rounded-[8px] bg-[#fff3f1] px-3 py-2 text-[12px] text-[#a73730]">{error}</p>}
        </div>

        <div className="shrink-0 space-y-2 border-t border-[#e8edf0] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <button type="button" disabled={!selectedSlot || !hasChanges || submitting || Boolean(phoneError)} onClick={saveChanges} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#087f83] px-4 text-[14px] font-semibold text-white hover:bg-[#06777a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c4c5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />{submitting ? "Saving Changes…" : "Save Changes"}
          </button>
          <button type="button" onClick={closeSheet} className="flex min-h-10 w-full items-center justify-center rounded-[8px] border border-[#dbe5e9] bg-white px-4 text-[13px] font-semibold text-[#526a7d] hover:bg-[#f6f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c4c5]">Cancel</button>
          <p className="flex items-center justify-center gap-1.5 text-[10px] text-[#718596]"><LockKeyhole className="h-3 w-3" aria-hidden="true" />Your information is secure and confidential</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
