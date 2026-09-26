"use client";

import { toZonedTime } from "date-fns-tz";
import { Check, ChevronRight, Clock3, CalendarDays } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { CLINIC_TZ } from "@/lib/tz";

export interface AppointmentRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reason_for_visit: string | null;
  reference: string;
  availableWeekdays: number[];
  physiotherapists: {
    id: string;
    full_name: string;
    specialisation: string | null;
    photo_url: string | null;
  } | null;
}

export interface AppointmentCardProps {
  appointment: AppointmentRow;
  selected: boolean;
  onSelect: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};

export function AppointmentCard({ appointment, selected, onSelect }: AppointmentCardProps) {
  const start = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
  const end = toZonedTime(new Date(appointment.ends_at), CLINIC_TZ);
  const dateLabel = start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const startLabel = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const duration = Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
  const physio = appointment.physiotherapists;
  const initials = physio?.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "PT";

  return (
    <button
      id={`appointment-${appointment.id}`}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group flex min-h-[118px] w-full items-center gap-3 rounded-[11px] border p-3 text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79c6c6] focus-visible:ring-offset-2 sm:gap-4 sm:p-4 ${
        selected
          ? "border-[#53abad] bg-[#f1fafa]"
          : "border-[#e1e8ed] bg-white hover:border-[#b9d8d9] hover:bg-[#fbfdfd]"
      }`}
    >
      {physio?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={physio.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover sm:h-14 sm:w-14" />
      ) : (
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8f5f5] text-[13px] font-semibold text-[#147d82] sm:h-14 sm:w-14">{initials}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#17878b]">{appointment.status === "confirmed" || appointment.status === "rescheduled" ? "Upcoming" : STATUS_LABELS[appointment.status] ?? appointment.status}</span>
          <StatusBadge status={appointment.status} />
        </span>
        <span className="block truncate text-[14px] font-semibold leading-5 text-[#18344b] sm:text-[15px]">{physio?.full_name ?? "Physiotherapist"}</span>
        {physio?.specialisation && <span className="mt-0.5 block truncate text-[12px] text-[#607688]">{physio.specialisation}</span>}
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#536b7c]">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-[#16888b]" aria-hidden="true" />{dateLabel}</span>
          <span className="inline-flex items-center gap-1 tabular-nums"><Clock3 className="h-3.5 w-3.5 text-[#16888b]" aria-hidden="true" />{startLabel}–{endLabel} ({duration} min)</span>
        </span>
      </span>
      <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#087f83] text-white" : "text-[#597286] group-hover:text-[#087f83]"}`}>
        {selected ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </span>
    </button>
  );
}
