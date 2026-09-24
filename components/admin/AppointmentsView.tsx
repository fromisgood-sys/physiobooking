"use client";

import { useState } from "react";
import { CalendarDays, Table2 } from "lucide-react";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { AppointmentsTable } from "@/components/admin/AppointmentsTable";

const VIEWS = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "table", label: "Table & export", icon: Table2 },
] as const;

export function AppointmentsView() {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("calendar");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-6 pb-4">
        <h1 className="text-[36px] font-bold leading-[40px] tracking-[-0.025em] text-azure-hover">
          Appointments
        </h1>
        <div role="tablist" aria-label="Appointments view" className="flex gap-1 rounded-full bg-paper-tint p-1">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(v.id)}
                className={`flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-150 ease-out ${
                  active ? "bg-azure text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "calendar" ? (
        <div className="border-t border-line">
          <AdminCalendar />
        </div>
      ) : (
        <div className="border-t border-line px-5 pb-8">
          <AppointmentsTable />
        </div>
      )}
    </div>
  );
}
