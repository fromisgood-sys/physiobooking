"use client";

import { useState } from "react";
import { AppointmentCard, type AppointmentRow } from "./AppointmentCard";

export interface AppointmentsTabsProps {
  initialUpcoming: AppointmentRow[];
  initialPast: AppointmentRow[];
}

const TABS = ["upcoming", "past"] as const;

export function AppointmentsTabs({ initialUpcoming, initialPast }: AppointmentsTabsProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("upcoming");
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [past, setPast] = useState(initialPast);

  async function refresh() {
    const res = await fetch("/api/appointments/me");
    if (!res.ok) return;
    const data = await res.json();
    setUpcoming(data.upcoming ?? []);
    setPast(data.past ?? []);
  }

  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mt-8">
      <div className="flex gap-2 border-b border-line" role="tablist" aria-label="Appointment history">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-[15px] font-medium capitalize transition-colors duration-150 ease-out ${
              tab === t ? "border-b-2 border-azure text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && (
          <p className="text-[15px] text-ink-soft">
            {tab === "upcoming" ? "No upcoming appointments." : "No past appointments yet."}
          </p>
        )}
        {rows.map((a) => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            upcoming={tab === "upcoming"}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  );
}
