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
  const trailing = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7;
  const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();
  const cells = [
    ...Array.from({ length: leadingBlanks }, (_, i) => {
      const day = prevMonthDays - leadingBlanks + 1 + i;
      return { date: `prev-${day}`, day, inMonth: false };
    }),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      date: `${viewYear}-${pad(viewMonth)}-${pad(i + 1)}`,
      day: i + 1,
      inMonth: true,
    })),
    ...Array.from({ length: trailing }, (_, i) => ({
      date: `next-${i + 1}`,
      day: i + 1,
      inMonth: false,
    })),
  ];

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
          className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#e2e9ed] text-[#456174] transition-colors duration-150 ease-out hover:bg-[#f1f8f8] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6]"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="text-[15px] font-bold text-[#18344b]" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#e2e9ed] text-[#456174] transition-colors duration-150 ease-out hover:bg-[#f1f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6]"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-[#748697]">
        {HEADINGS.map((h) => (
          <span key={h} className="py-2">
            {h}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-x-1 gap-y-0.5" role="listbox" aria-label="Choose an appointment date">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return (
              <span
                key={cell.date}
                aria-hidden="true"
                className="mx-auto flex aspect-square w-full max-w-10 items-center justify-center text-[12px] tabular-nums text-[#b3bec7]"
              >
                {cell.day}
              </span>
            );
          }
          const bookable =
            cell.date >= todayLabel && availableWeekdays.includes(weekdayOfDateLabel(cell.date));
          const selected = cell.date === selectedDate;
          const accessibleDate = new Date(`${cell.date}T12:00:00`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          return (
            <button
              key={cell.date}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`${accessibleDate}, ${selected ? "selected" : bookable ? "scheduled clinic day" : "unavailable"}`}
              disabled={!bookable}
              onClick={() => onSelect(cell.date)}
              className={`relative mx-auto flex aspect-square w-full max-w-10 flex-col items-center justify-center rounded-full text-[12px] tabular-nums transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6] focus-visible:ring-offset-1 ${
                selected
                  ? "bg-[#087f83] font-semibold text-white"
                  : bookable
                    ? "font-medium text-[#243f54] hover:bg-[#eaf6f5]"
                    : "cursor-not-allowed text-[#b4bec6]"
              }`}
            >
              {cell.day}
              {bookable && <span aria-hidden="true" className={`absolute bottom-[3px] h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-[#15979a]"}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
