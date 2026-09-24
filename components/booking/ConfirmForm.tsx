"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ConfirmFormProps {
  physioId: string;
  startUtc: string;
}

export function ConfirmForm({ physioId, startUtc }: ConfirmFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
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

      router.push(`/book/success?ref=${encodeURIComponent(data.reference)}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-[15px] font-medium text-ink">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          required
          minLength={6}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-11 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure-ring"
          placeholder="+264 81 234 5678"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-[15px] font-medium text-ink">
          Reason for visit
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="rounded-btn border border-line-strong bg-paper px-3 py-2 text-[15px] text-ink outline-none focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure-ring"
          placeholder="Optional — helps your physiotherapist prepare"
        />
      </div>

      {error && <p className="text-[15px] text-state-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 items-center justify-center rounded-btn bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover disabled:opacity-50"
      >
        {submitting ? "Confirming…" : "Confirm booking"}
      </button>
    </form>
  );
}
