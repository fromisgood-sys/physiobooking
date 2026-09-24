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
      className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8"
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
            className={`flex h-11 min-w-[44px] items-center justify-center rounded-btn text-[15px] font-medium tabular-nums transition-colors duration-150 ease-out ${
              selected
                ? "bg-azure text-white"
                : available
                  ? "bg-paper-tint text-ink hover:bg-azure-soft"
                  : "bg-paper-sunk text-ink-muted/50 line-through"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
