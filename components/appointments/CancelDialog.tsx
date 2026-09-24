"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  onCancelled: () => void;
}

export function CancelDialog({
  open,
  onOpenChange,
  appointmentId,
  onCancelled,
}: CancelDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not cancel.");
        setSubmitting(false);
        return;
      }

      onCancelled();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this appointment?</DialogTitle>
        </DialogHeader>

        <p className="text-[15px] text-ink-soft">
          This can&rsquo;t be undone. You&rsquo;ll need to book a new time if you change your
          mind.
        </p>

        {error && <p className="text-[15px] text-state-danger">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-11 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
          >
            Keep appointment
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="flex h-11 items-center justify-center rounded-btn bg-state-danger px-4 text-[15px] font-medium text-white transition-colors duration-150 ease-out disabled:opacity-50"
          >
            {submitting ? "Cancelling…" : "Cancel appointment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
