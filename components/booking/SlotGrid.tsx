"use client";

import type { Slot } from "@/lib/slots";
import { SESSION_MINUTES } from "@/lib/tz";

export interface SlotGridProps {
  allLabels: string[];
  slots: Slot[];
  selectedLabel: string | null;
  onSelect: (slot: Slot) => void;
}

function endLabel(label: string): string {
  const [h, m] = label.split(":").map(Number);
  const total = h * 60 + m + SESSION_MINUTES;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function SlotGrid({ allLabels, slots, selectedLabel, onSelect }: SlotGridProps) {
  const byLabel = new Map(slots.map((s) => [s.label, s]));

  return (
    <div
      className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4 sm:gap-2.5 xl:grid-cols-6"
      role="listbox"
      aria-label="Choose a time"
    >
      {allLabels.map((label) => {
        const slot = byLabel.get(label);
        const available = Boolean(slot);
        const selected = selectedLabel === label;

        return (
          <button
            key={label}
            type="button"
            role="option"
            aria-selected={selected}
            aria-disabled={!available}
            aria-label={`${label} to ${endLabel(label)}, ${available ? "available" : "unavailable"}`}
            disabled={!available}
            onClick={() => slot && onSelect(slot)}
            className={`flex min-h-10 min-w-0 items-center justify-center rounded-[8px] border text-[12px] font-semibold tabular-nums transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6] focus-visible:ring-offset-1 sm:min-h-11 sm:text-[13px] ${
              selected
                ? "border-[#087f83] bg-[#087f83] text-white"
                : available
                  ? "border-[#dce5eb] bg-white text-[#294559] hover:border-[#8fc9c9] hover:bg-[#eff9f8]"
                  : "border-[#edf0f2] bg-[#f6f8f9] text-[#bdc6cc] line-through"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
