"use client";

import { useEffect, useState } from "react";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DayStrip } from "@/components/booking/DayStrip";
import { SlotGrid } from "@/components/booking/SlotGrid";
import type { Slot } from "@/lib/slots";
import { CLINIC_TZ, allSlotLabels } from "@/lib/tz";

const ALL_LABELS = allSlotLabels();
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  physioId: string;
  physioName: string;
  onRescheduled: () => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  appointmentId,
  physioId,
  physioName,
  onRescheduled,
}: RescheduleDialogProps) {
  const [todayLabel] = useState(() => format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd"));
  const [selectedDate, setSelectedDate] = useState(todayLabel);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSlots(null);
    setSelectedSlot(null);

    fetch(`/api/availability?physioId=${physioId}&date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]));
  }, [open, physioId, selectedDate]);

  async function handleConfirm() {
    if (!selectedSlot || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startUtc: selectedSlot.startUtc }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not reschedule.");
        setSubmitting(false);
        return;
      }

      onRescheduled();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule with {physioName}</DialogTitle>
        </DialogHeader>

        <DayStrip
          todayLabel={todayLabel}
          selectedDate={selectedDate}
          availableWeekdays={ALL_WEEKDAYS}
          onSelect={setSelectedDate}
        />

        <div className="mt-4">
          {slots === null && <p className="text-[15px] text-ink-soft">Loading times&hellip;</p>}
          {slots !== null && slots.length === 0 && (
            <p className="text-[15px] text-ink-soft">No times available on this day.</p>
          )}
          {slots !== null && slots.length > 0 && (
            <SlotGrid
              allLabels={ALL_LABELS}
              slots={slots}
              selectedLabel={selectedSlot?.label ?? null}
              onSelect={setSelectedSlot}
            />
          )}
        </div>

        {error && <p className="mt-2 text-[15px] text-state-danger">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            disabled={!selectedSlot || submitting}
            onClick={handleConfirm}
            className="flex h-11 items-center justify-center rounded-btn bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Confirm new time"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
