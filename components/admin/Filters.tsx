"use client";

import { useEffect, useState } from "react";

export interface AdminFiltersValue {
  dateFrom: string;
  dateTo: string;
  physioId: string;
  status: string;
  q: string;
}

export interface FiltersProps {
  value: AdminFiltersValue;
  onApply: (value: AdminFiltersValue) => void;
}

const STATUS_OPTIONS = ["", "confirmed", "rescheduled", "cancelled", "completed", "no_show"];

const inputClass =
  "h-10 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure-ring";
const labelClass = "text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted";

export function Filters({ value, onApply }: FiltersProps) {
  const [draft, setDraft] = useState(value);
  const [physios, setPhysios] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    fetch("/api/physiotherapists")
      .then((res) => res.json())
      .then((data) => setPhysios(data.physiotherapists ?? []))
      .catch(() => setPhysios([]));
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
      }}
      className="mt-6 flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="dateFrom">
          From
        </label>
        <input
          id="dateFrom"
          type="date"
          value={draft.dateFrom}
          onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="dateTo">
          To
        </label>
        <input
          id="dateTo"
          type="date"
          value={draft.dateTo}
          onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="physioId">
          Physiotherapist
        </label>
        <select
          id="physioId"
          value={draft.physioId}
          onChange={(e) => setDraft({ ...draft, physioId: e.target.value })}
          className={inputClass}
        >
          <option value="">All</option>
          {physios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="status">
          Status
        </label>
        <select
          id="status"
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All" : s.replace("_", "-")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="q">
          Search
        </label>
        <input
          id="q"
          type="text"
          placeholder="Name or email"
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        className="flex h-10 items-center justify-center rounded-btn bg-azure px-4 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
      >
        Apply
      </button>
    </form>
  );
}
