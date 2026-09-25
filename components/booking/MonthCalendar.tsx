"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { weekdayOfDateLabel } from "@/lib/tz";

const HEADINGS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface MonthCalendarProps {
  /** "yyyy-MM-dd", clinic-local */
  todayLabel: string;
  selectedDate: string;
  availableWeekdays: number[];
  onSelect: (date: string) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function MonthCalendar({
  todayLabel,
  selectedDate,
  availableWeekdays,
  onSelect,
}: MonthCalendarProps) {
  const [viewYear, setViewYear] = useState(() => Number(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selectedDate.slice(5, 7)));

  const todayYear = Number(todayLabel.slice(0, 4));
  const todayMonth = Number(todayLabel.slice(5, 7));
  const atCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = weekdayOfDateLabel(`${viewYear}-${pad(viewMonth)}-01`);
  const leadingBlanks = (firstWeekday + 6) % 7;

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={atCurrentMonth}
          onClick={() => shiftMonth(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-btn text-ink-soft transition-colors duration-150 ease-out hover:bg-paper-sunk disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="text-[17px] font-semibold text-ink" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="flex h-11 w-11 items-center justify-center rounded-btn text-ink-soft transition-colors duration-150 ease-out hover:bg-paper-sunk"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[13px] font-medium text-ink-muted">
        {HEADINGS.map((h) => (
          <span key={h} className="py-2">
            {h}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1" role="listbox" aria-label="Choose a date">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
          const bookable = date >= todayLabel && availableWeekdays.includes(weekdayOfDateLabel(date));
          const selected = date === selectedDate;

          return (
            <button
              key={date}
              type="button"
              role="option"
              aria-selected={selected}
              aria-disabled={!bookable}
              disabled={!bookable}
              onClick={() => onSelect(date)}
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-btn text-[15px] tabular-nums transition-colors duration-150 ease-out ${
                selected
                  ? "bg-azure font-semibold text-white"
                  : bookable
                    ? "font-medium text-ink hover:bg-azure-soft"
                    : "text-ink-muted/40"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
