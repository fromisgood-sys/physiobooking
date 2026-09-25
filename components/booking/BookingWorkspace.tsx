"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { SlotGrid } from "./SlotGrid";
import type { Slot } from "@/lib/slots";
import { allSlotLabels, SESSION_MINUTES, weekdayOfDateLabel } from "@/lib/tz";

export interface WorkspacePhysio {
  id: string;
  fullName: string;
  specialisation: string | null;
  bio: string | null;
  photoUrl: string | null;
  availableWeekdays: number[];
}

const ALL_LABELS = allSlotLabels();

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ physio, size }: { physio: WorkspacePhysio; size: number }) {
  const style = { width: size, height: size };
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return physio.photoUrl && failedUrl !== physio.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={physio.photoUrl}
      alt=""
      style={style}
      onError={() => setFailedUrl(physio.photoUrl)}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <div
      aria-hidden="true"
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-azure-soft text-[15px] font-semibold text-azure-hover"
    >
      {initialsOf(physio.fullName)}
    </div>
  );
}

function firstBookableDate(todayLabel: string, weekdays: number[]): string {
  for (let i = 0; i < 60; i++) {
    const [y, m, d] = todayLabel.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + i));
    const label = next.toISOString().slice(0, 10);
    if (weekdays.includes(weekdayOfDateLabel(label))) return label;
  }
  return todayLabel;
}

export function BookingWorkspace({
  physios,
  todayLabel,
}: {
  physios: WorkspacePhysio[];
  todayLabel: string;
}) {
  const [physioId, setPhysioId] = useState(physios[0]?.id ?? "");
  const physio = physios.find((p) => p.id === physioId) ?? physios[0];
  const [selectedDate, setSelectedDate] = useState(() =>
    firstBookableDate(todayLabel, physios[0]?.availableWeekdays ?? [])
  );
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!physio) return;
    let cancelled = false;
    setSlots(null);
    setSelectedSlot(null);
    setError(false);

    fetch(`/api/availability?physioId=${physio.id}&date=${selectedDate}`)
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
  }, [physio, selectedDate]);

  if (!physio) return null;

  function choosePhysio(next: WorkspacePhysio) {
    setPhysioId(next.id);
    if (!next.availableWeekdays.includes(weekdayOfDateLabel(selectedDate))) {
      setSelectedDate(firstBookableDate(todayLabel, next.availableWeekdays));
    }
  }

  const [y, m, d] = selectedDate.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="min-w-0 rounded-card border border-line bg-paper p-3 lg:p-4">
        <h1 className="px-2 pb-2 pt-2 text-[24px] font-bold leading-[30px] tracking-[-0.02em] text-ink lg:px-3">
          Choose a physiotherapist
        </h1>
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {physios.map((p) => {
            const active = p.id === physio.id;
            return (
              <li key={p.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => choosePhysio(p)}
                  className={`flex min-h-[64px] w-full items-center gap-3 rounded-btn px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
                    active ? "bg-azure text-white" : "text-ink hover:bg-paper-tint"
                  }`}
                >
                  <Avatar physio={p} size={48} />
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold leading-5">{p.fullName}</span>
                    {p.specialisation && (
                      <span
                        className={`mt-0.5 block text-[14px] leading-5 ${
                          active ? "text-white/85" : "text-ink-soft"
                        }`}
                      >
                        {p.specialisation}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section
        aria-label={`Availability for ${physio.fullName}`}
        className="min-w-0 rounded-card border border-line bg-paper p-5 sm:p-8"
      >
        <div className="flex items-center gap-5">
          <Avatar physio={physio} size={88} />
          <div className="min-w-0">
            <h2 className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-ink">
              {physio.fullName}
            </h2>
            {physio.specialisation && (
              <p className="mt-0.5 text-[16px] text-ink-soft">{physio.specialisation}</p>
            )}
          </div>
        </div>
        {physio.bio && (
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-ink-soft">{physio.bio}</p>
        )}

        <div className="mt-6 border-t border-line pt-6">
          <MonthCalendar
            todayLabel={todayLabel}
            selectedDate={selectedDate}
            availableWeekdays={physio.availableWeekdays}
            onSelect={setSelectedDate}
          />
        </div>

        <div className="mt-6 border-t border-line pt-6">
          <h3 className="text-[17px] font-semibold text-ink">Available times</h3>
          <div className="mt-3">
            {error && (
              <p className="text-[15px] text-state-danger">
                Couldn&rsquo;t load times for this date. Try again.
              </p>
            )}
            {!error && slots === null && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-hidden="true">
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
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-card bg-lime-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 shrink-0 text-lime-ink" aria-hidden="true" />
            <div>
              <p className="text-[16px] font-semibold tabular-nums text-ink">
                {selectedSlot ? `${dateLabel} at ${selectedSlot.label}` : dateLabel}
              </p>
              <p className="text-[14px] text-ink-soft">
                {selectedSlot
                  ? `${SESSION_MINUTES} minute session with ${physio.fullName}`
                  : "Pick a time to continue"}
              </p>
            </div>
          </div>
          {selectedSlot ? (
            <Link
              href={`/book/${physio.id}/confirm?start=${encodeURIComponent(selectedSlot.startUtc)}`}
              className="flex h-11 shrink-0 items-center justify-center rounded-btn bg-azure px-8 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
            >
              Book
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex h-11 shrink-0 items-center justify-center rounded-btn bg-paper-sunk px-8 text-[15px] font-medium text-ink-muted"
            >
              Book
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
