"use client";

import { useState } from "react";
import { toZonedTime } from "date-fns-tz";
import { StatusBadge } from "./StatusBadge";
import { RescheduleDialog } from "./RescheduleDialog";
import { CancelDialog } from "./CancelDialog";
import { CLINIC_TZ } from "@/lib/tz";

export interface AppointmentRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reason_for_visit: string | null;
  physiotherapists: { id: string; full_name: string; specialisation: string | null } | null;
}

export interface AppointmentCardProps {
  appointment: AppointmentRow;
  upcoming: boolean;
  onChanged: () => void;
}

const ACTIVE_STATUSES = ["confirmed", "rescheduled"];

export function AppointmentCard({ appointment, upcoming, onChanged }: AppointmentCardProps) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const start = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
  const dateLabel = start.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const canAct = upcoming && ACTIVE_STATUSES.includes(appointment.status);
  const physio = appointment.physiotherapists;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[18px] font-semibold leading-6 tracking-[-0.01em] text-ink">
          {physio?.full_name ?? "Physiotherapist"}
        </p>
        <p className="mt-1 text-[15px] tabular-nums text-ink-soft">
          {dateLabel} &middot; {timeLabel}
        </p>
        <div className="mt-2">
          <StatusBadge status={appointment.status} />
        </div>
      </div>

      {canAct && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRescheduleOpen(true)}
            className="flex h-11 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="flex h-11 items-center justify-center rounded-btn px-4 text-[15px] font-medium text-state-danger transition-colors duration-150 ease-out hover:bg-state-danger-soft"
          >
            Cancel
          </button>
        </div>
      )}

      {canAct && physio && (
        <RescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          appointmentId={appointment.id}
          physioId={physio.id}
          physioName={physio.full_name}
          onRescheduled={() => {
            setRescheduleOpen(false);
            onChanged();
          }}
        />
      )}

      {canAct && (
        <CancelDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          appointmentId={appointment.id}
          onCancelled={() => {
            setCancelOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
