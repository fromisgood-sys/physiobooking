"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export interface ConfirmFormProps {
  physioId: string;
  startUtc: string;
  initialPhone?: string;
  presentation?: "page" | "panel";
}

export function ConfirmForm({
  physioId,
  startUtc,
  initialPhone = "",
  presentation = "page",
}: ConfirmFormProps) {
  const router = useRouter();
  const inPanel = presentation === "panel";
  const [phone, setPhone] = useState(initialPhone);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ physioId, startUtc, phone, reasonForVisit: reason || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create the booking.");
        setSubmitting(false);
        return;
      }

      router.push(`/book/success?ref=${encodeURIComponent(data.reference)}&email=${encodeURIComponent(data.notification ?? "not_configured")}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={inPanel ? "flex min-h-0 flex-1 flex-col" : "mt-8 flex max-w-md flex-col gap-5"}
    >
      <div className={inPanel ? "min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" : "contents"}>
        {inPanel && <h3 className="text-[13px] font-bold text-[#20394e]">Your details</h3>}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inPanel ? "panel-phone" : "phone"}
            className={`${inPanel ? "text-[13px]" : "text-[15px]"} font-medium text-ink`}
          >
            {inPanel ? "Cellphone number" : "Phone number"}
            {inPanel && <span className="ml-1 text-state-danger" aria-hidden="true">*</span>}
          </label>
          <input
            id={inPanel ? "panel-phone" : "phone"}
            type="tel"
            required
            minLength={6}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inPanel ? "h-11 w-full rounded-[8px] border border-line-strong bg-paper px-3 text-[14px] text-ink outline-none focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure-ring" : "h-11 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure-ring"}
            placeholder={inPanel ? undefined : "+264 81 234 5678"}
          />
          {inPanel && <p className="text-[11px] text-ink-muted">We’ll use this number to contact you about your appointment.</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inPanel ? "panel-reason" : "reason"}
            className={`${inPanel ? "text-[13px]" : "text-[15px]"} font-medium text-ink`}
          >
            {inPanel ? "Comments for the physiotherapist (optional)" : "Reason for visit"}
          </label>
          <textarea
            id={inPanel ? "panel-reason" : "reason"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={inPanel ? 250 : undefined}
            className={inPanel ? "min-h-[88px] w-full resize-y rounded-[8px] border border-line-strong bg-paper px-3 py-2 text-[14px] text-ink outline-none focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure-ring" : "rounded-btn border border-line-strong bg-paper px-3 py-2 text-[15px] text-ink outline-none focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure-ring"}
            placeholder={inPanel ? "Please let us know if there’s anything we should know before your session." : "Optional — helps your physiotherapist prepare"}
          />
          {inPanel && <p className="text-right text-[11px] tabular-nums text-ink-muted">{reason.length} / 250</p>}
        </div>

        {error && <p role="alert" className={`${inPanel ? "text-[13px]" : "text-[15px]"} text-state-danger`}>{error}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`flex min-h-11 items-center justify-center rounded-[8px] px-6 text-[14px] font-semibold text-white transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c4c5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inPanel ? "mx-5 mb-2 bg-[#087f83] hover:bg-[#06777a]" : "rounded-btn bg-azure text-[15px] font-medium hover:bg-azure-hover"}`}
      >
        {submitting ? "Confirming…" : inPanel ? "Confirm Booking" : "Confirm booking"}
      </button>
      {inPanel && (
        <p className="mb-[max(16px,env(safe-area-inset-bottom))] flex items-center justify-center gap-1.5 px-4 text-[11px] text-ink-muted">
          <LockKeyhole className="h-3 w-3" aria-hidden="true" />Your booking is secure and confidential
        </p>
      )}
    </form>
  );
}
