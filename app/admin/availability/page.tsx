"use client";

import { useEffect, useState } from "react";
import { AvailabilityEditor } from "@/components/admin/AvailabilityEditor";

export default function AdminAvailabilityPage() {
  const [physios, setPhysios] = useState<{ id: string; full_name: string }[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/physiotherapists")
      .then((res) => res.json())
      .then((data) => {
        setPhysios(data.physiotherapists ?? []);
        if (data.physiotherapists?.[0]) setSelected(data.physiotherapists[0].id);
      })
      .catch(() => setPhysios([]));
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Availability
      </h1>

      <div className="mt-6 flex flex-col gap-1">
        <label
          className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted"
          htmlFor="physio"
        >
          Physiotherapist
        </label>
        <select
          id="physio"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-10 w-64 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
        >
          {physios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      {selected && <AvailabilityEditor key={selected} physioId={selected} />}
    </main>
  );
}
