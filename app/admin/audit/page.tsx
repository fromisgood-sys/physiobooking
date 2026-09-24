"use client";

import { useEffect, useState } from "react";

interface AuditRow {
  id: number;
  appointment_id: string;
  action: string;
  created_at: string;
  changed_by: { full_name: string | null; email: string } | null;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    fetch(`/api/admin/audit?page=${page}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setRows([]));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Audit log
      </h1>

      {rows === null && <p className="mt-8 text-[15px] text-ink-soft">Loading&hellip;</p>}
      {rows !== null && rows.length === 0 && (
        <p className="mt-8 text-[15px] text-ink-soft">No changes recorded yet.</p>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="mt-8 flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-card border border-line bg-paper p-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium capitalize text-ink">
                  {row.action.replace("_", " ")}
                </p>
                <p className="text-[13px] tabular-nums text-ink-muted">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-[15px] text-ink-soft">
                By {row.changed_by?.full_name ?? row.changed_by?.email ?? "system"} &middot;
                appointment {row.appointment_id.slice(0, 8)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="flex h-11 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink disabled:opacity-50"
        >
          Previous
        </button>
        <p className="text-[15px] text-ink-soft">
          Page {page} of {totalPages}
        </p>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="flex h-11 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </main>
  );
}
