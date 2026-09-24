"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentNotes: string | null;
  currentStatus: string;
  onSaved: () => void;
}

const STATUS_OPTIONS = ["confirmed", "rescheduled", "completed", "no_show"] as const;

export function EditDialog({
  open,
  onOpenChange,
  appointmentId,
  currentNotes,
  currentStatus,
  onSaved,
}: EditDialogProps) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const patch: Record<string, unknown> = { notes };
    if ((status === "completed" || status === "no_show") && status !== currentStatus) {
      patch.status = status;
    }

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        setSubmitting(false);
        return;
      }

      onSaved();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit appointment</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[15px] font-medium text-ink" htmlFor="edit-status">
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} disabled={s === "confirmed" || s === "rescheduled"}>
                  {s.replace("_", "-")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[15px] font-medium text-ink" htmlFor="edit-notes">
              Notes (admin only)
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="rounded-btn border border-line-strong bg-paper px-3 py-2 text-[15px] text-ink"
            />
          </div>
        </div>

        {error && <p className="text-[15px] text-state-danger">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSave}
            className="flex h-11 items-center justify-center rounded-btn bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
