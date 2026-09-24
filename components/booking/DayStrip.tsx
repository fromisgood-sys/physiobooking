"use client";

import { addDaysToDateLabel, weekdayOfDateLabel } from "@/lib/tz";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_SHOWN = 30;

export interface DayStripProps {
  todayLabel: string;
  selectedDate: string;
  availableWeekdays: number[];
  onSelect: (date: string) => void;
}

export function DayStrip({
  todayLabel,
  selectedDate,
  availableWeekdays,
  onSelect,
}: DayStripProps) {
  const dates = Array.from({ length: DAYS_SHOWN }, (_, i) => addDaysToDateLabel(todayLabel, i));

  return (
    <div
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2"
      role="listbox"
      aria-label="Choose a date"
    >
      {dates.map((date) => {
        const weekday = weekdayOfDateLabel(date);
        const available = availableWeekdays.includes(weekday);
        const selected = date === selectedDate;
        const day = date.slice(-2);

        return (
          <button
            key={date}
            type="button"
            role="option"
            aria-selected={selected}
            aria-disabled={!available}
            disabled={!available}
            onClick={() => onSelect(date)}
            className={`flex min-w-[56px] shrink-0 snap-start flex-col items-center gap-1 rounded-btn px-3 py-2.5 text-center transition-colors duration-150 ease-out ${
              selected
                ? "bg-azure text-white"
                : available
                  ? "bg-paper text-ink hover:bg-paper-tint"
                  : "bg-paper-sunk text-ink-muted"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.06em]">
              {WEEKDAY_LABELS[weekday]}
            </span>
            <span className="text-[15px] font-medium tabular-nums">{day}</span>
          </button>
        );
      })}
    </div>
  );
}
