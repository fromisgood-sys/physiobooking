"use client";

import { useEffect, useState } from "react";
import { DayStrip } from "./DayStrip";
import { SlotGrid } from "./SlotGrid";
import { SummaryBar } from "./SummaryBar";
import type { Slot } from "@/lib/slots";
import { allSlotLabels } from "@/lib/tz";

export interface SlotPickerProps {
  physioId: string;
  todayLabel: string;
  availableWeekdays: number[];
}

const ALL_LABELS = allSlotLabels();

export function SlotPicker({ physioId, todayLabel, availableWeekdays }: SlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState(todayLabel);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setSelectedSlot(null);
    setError(false);

    fetch(`/api/availability?physioId=${physioId}&date=${selectedDate}`)
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSlots(data.slots);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [physioId, selectedDate]);

  return (
    <div className="mt-10 pb-24">
      <DayStrip
        todayLabel={todayLabel}
        selectedDate={selectedDate}
        availableWeekdays={availableWeekdays}
        onSelect={setSelectedDate}
      />

      <div className="mt-8">
        {error && (
          <p className="text-[15px] text-state-danger">
            Couldn&rsquo;t load times for this date. Try again.
          </p>
        )}

        {!error && slots === null && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-11 rounded-btn bg-paper-sunk" />
            ))}
          </div>
        )}

        {!error && slots !== null && slots.length === 0 && (
          <p className="text-[15px] text-ink-soft">No times available on this day.</p>
        )}

        {!error && slots !== null && slots.length > 0 && (
          <SlotGrid
            allLabels={ALL_LABELS}
            slots={slots}
            selectedLabel={selectedSlot?.label ?? null}
            onSelect={setSelectedSlot}
          />
        )}
      </div>

      {selectedSlot && (
        <SummaryBar
          date={selectedDate}
          time={selectedSlot.label}
          href={`/book/${physioId}/confirm?start=${encodeURIComponent(selectedSlot.startUtc)}`}
        />
      )}
    </div>
  );
}
