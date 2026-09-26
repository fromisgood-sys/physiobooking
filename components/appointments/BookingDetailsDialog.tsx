"use client";

import { useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AppointmentRow } from "./AppointmentCard";
import { LockKeyhole, Save, X } from "lucide-react";

export function BookingDetailsDialog({
  appointment,
  phoneNumber,
  open,
  onOpenChange,
  onSaved,
}: {
  appointment: AppointmentRow;
  phoneNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [phone, setPhone] = useState(phoneNumber);
  const [comments, setComments] = useState(appointment.reason_for_visit ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, reasonForVisit: comments }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not update booking details.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Couldn’t reach the server. Try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-y-0 !left-auto !right-0 !top-0 !h-dvh !w-full !max-w-[460px] !translate-x-0 !translate-y-0 !flex flex-col gap-0 overflow-hidden rounded-none border-l border-[#e1e8ed] bg-white !p-0 text-[#172f44] shadow-[-12px_0_36px_rgba(17,39,58,0.14)] outline-none max-sm:!inset-x-0 max-sm:!left-0 max-sm:!right-0 max-sm:!top-auto max-sm:!bottom-0 max-sm:!h-[92dvh] max-sm:rounded-t-[18px] max-sm:rounded-b-none max-sm:border-l-0 max-sm:border-t max-sm:shadow-[0_-12px_36px_rgba(17,39,58,0.16)]"
      >
        <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#c9d3da] sm:hidden" aria-hidden="true" />
        <DialogHeader className="relative shrink-0 border-b border-[#e9eef1] px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
          <DialogTitle className="pr-10 text-[19px] font-bold leading-6 text-[#172f44]">Update Booking Details</DialogTitle>
          <DialogDescription className="mt-1.5 text-[12px] leading-[18px] text-[#617587]">
            Update the cellphone number and comments for your physiotherapist.
          </DialogDescription>
          <DialogClose
            aria-label="Close booking details"
            render={<button type="button" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-[8px] text-[#52697b] hover:bg-[#f2f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6] sm:right-5 sm:top-5" />}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="booking-phone" className="text-[13px] font-medium text-[#20394e]">
                Cellphone number <span className="text-[#b33d37" aria-hidden="true">*</span>
              </label>
              <input
                id="booking-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                minLength={6}
                maxLength={30}
                autoComplete="tel"
                className="h-11 rounded-[8px] border border-[#d8e1e7] px-3 text-[14px] text-[#20394e] outline-none focus-visible:ring-2 focus-visible:ring-[#83cece]"
              />
              <p className="text-[11px] text-[#758899]">We’ll use this number to contact you about your appointment.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="booking-comments" className="text-[13px] font-medium text-[#20394e]">Comments for the physiotherapist</label>
              <textarea
                id="booking-comments"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                maxLength={500}
                rows={5}
                className="min-h-[120px] resize-y rounded-[8px] border border-[#d8e1e7] px-3 py-2.5 text-[14px] leading-5 text-[#20394e] outline-none focus-visible:ring-2 focus-visible:ring-[#83cece]"
                placeholder="Share anything your physiotherapist should know before your session."
              />
              <p className="text-right text-[11px] tabular-nums text-[#758899]">{comments.length} / 500</p>
            </div>
            {error && <p role="alert" className="text-[13px] text-[#a73730]">{error}</p>}
          </div>

          <div className="shrink-0 border-t border-[#e8edf0] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <button type="submit" disabled={saving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#087f83] px-4 text-[14px] font-semibold text-white hover:bg-[#06777a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c4c5] focus-visible:ring-offset-2 disabled:opacity-50">
              <Save className="h-4 w-4" aria-hidden="true" />{saving ? "Saving…" : "Save Booking Details"}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#758899]"><LockKeyhole className="h-3 w-3" aria-hidden="true" />Your details are secure and confidential</p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}