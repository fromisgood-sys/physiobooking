"use client";

import { useEffect, useState } from "react";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { RescheduleDialog } from "@/components/appointments/RescheduleDialog";
import { CancelDialog } from "@/components/appointments/CancelDialog";
import { EditDialog } from "@/components/admin/EditDialog";
import { Filters, type AdminFiltersValue } from "@/components/admin/Filters";
import { ExportButton } from "@/components/admin/ExportButton";
import { CLINIC_TZ } from "@/lib/tz";

interface AdminAppointmentRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reason_for_visit: string | null;
  notes: string | null;
  created_at: string;
  physiotherapist_id: string;
  patient: { full_name: string | null; email: string; phone: string | null } | null;
  physiotherapists: { full_name: string } | null;
}

const COLUMNS = [
  "Patient",
  "Email",
  "Phone",
  "Physiotherapist",
  "Date",
  "Start",
  "End",
  "Status",
  "Reason",
  "Notes",
  "Created",
  "Actions",
];

const EMPTY_FILTERS: AdminFiltersValue = { dateFrom: "", dateTo: "", physioId: "", status: "", q: "" };
const ACTIVE_STATUSES = ["confirmed", "rescheduled"];

export function AppointmentsTable() {
  const [rows, setRows] = useState<AdminAppointmentRow[] | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AdminFiltersValue>(EMPTY_FILTERS);
  const [rescheduleTarget, setRescheduleTarget] = useState<AdminAppointmentRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminAppointmentRow | null>(null);
  const [editTarget, setEditTarget] = useState<AdminAppointmentRow | null>(null);
  const pageSize = 20;

  function query(withPage: boolean) {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.physioId) params.set("physioId", filters.physioId);
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    if (withPage) params.set("page", String(page));
    return params.toString();
  }

  function refresh() {
    let cancelled = false;
    setRows(null);
    setError(false);

    fetch(`/api/admin/appointments?${query(true)}`)
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(refresh, [page, filters]);

  async function markStatus(row: AdminAppointmentRow, status: "completed" | "no_show") {
    await fetch(`/api/appointments/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function cell(row: AdminAppointmentRow) {
    const start = toZonedTime(new Date(row.starts_at), CLINIC_TZ);
    const end = toZonedTime(new Date(row.ends_at), CLINIC_TZ);
    const created = toZonedTime(new Date(row.created_at), CLINIC_TZ);

    return {
      patient: row.patient?.full_name ?? "—",
      email: row.patient?.email ?? "—",
      phone: row.patient?.phone ?? "—",
      physio: row.physiotherapists?.full_name ?? "—",
      date: format(start, "yyyy-MM-dd"),
      startTime: format(start, "HH:mm"),
      endTime: format(end, "HH:mm"),
      reason: row.reason_for_visit ?? "—",
      notes: row.notes ?? "—",
      created: format(created, "yyyy-MM-dd HH:mm"),
    };
  }

  function RowActions({ row }: { row: AdminAppointmentRow }) {
    const active = ACTIVE_STATUSES.includes(row.status);
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-medium">
        {active && (
          <button
            type="button"
            onClick={() => setRescheduleTarget(row)}
            className="text-azure-hover hover:underline"
          >
            Reschedule
          </button>
        )}
        <button type="button" onClick={() => setEditTarget(row)} className="text-ink hover:underline">
          Edit
        </button>
        {active && (
          <>
            <button
              type="button"
              onClick={() => markStatus(row, "completed")}
              className="text-state-ok hover:underline"
            >
              Mark completed
            </button>
            <button
              type="button"
              onClick={() => markStatus(row, "no_show")}
              className="text-state-warn hover:underline"
            >
              Mark no-show
            </button>
            <button
              type="button"
              onClick={() => setCancelTarget(row)}
              className="text-state-danger hover:underline"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Filters value={filters} onApply={(v) => { setPage(1); setFilters(v); }} />
        <ExportButton query={query(false)} />
      </div>

      {rows === null && !error && (
        <p className="mt-6 text-[15px] text-ink-soft">Loading appointments&hellip;</p>
      )}

      {error && (
        <p className="mt-6 text-[15px] text-state-danger">
          Couldn&rsquo;t load appointments. Try refreshing the page.
        </p>
      )}

      {rows !== null && !error && rows.length === 0 && (
        <p className="mt-6 text-[15px] text-ink-soft">No appointments match these filters.</p>
      )}

      {rows !== null && !error && rows.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto rounded-card border border-line sm:block">
            <table className="w-full min-w-[1300px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-line bg-paper-tint text-left">
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const c = cell(row);
                  return (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{c.patient}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{c.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{c.phone}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{c.physio}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">{c.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">
                        {c.startTime}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">
                        {c.endTime}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-ink-soft">{c.reason}</td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-ink-soft">{c.notes}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">
                        {c.created}
                      </td>
                      <td className="px-4 py-3">
                        <RowActions row={row} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="mt-6 flex flex-col gap-4 sm:hidden">
            {rows.map((row) => {
              const c = cell(row);
              return (
                <div key={row.id} className="rounded-card border border-line bg-paper p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-ink">{c.patient}</p>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-1 text-[15px] text-ink-soft">{c.physio}</p>
                  <p className="mt-1 text-[15px] tabular-nums text-ink-soft">
                    {c.date} &middot; {c.startTime}&ndash;{c.endTime}
                  </p>
                  <p className="mt-2 text-[15px] text-ink-soft">{c.email}</p>
                  <p className="text-[15px] text-ink-soft">{c.phone}</p>
                  {row.reason_for_visit && (
                    <p className="mt-2 text-[15px] text-ink-soft">Reason: {c.reason}</p>
                  )}
                  {row.notes && <p className="mt-1 text-[15px] text-ink-soft">Notes: {c.notes}</p>}
                  <div className="mt-3 border-t border-line pt-3">
                    <RowActions row={row} />
                  </div>
                </div>
              );
            })}
          </div>

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
        </>
      )}

      {rescheduleTarget && (
        <RescheduleDialog
          open={Boolean(rescheduleTarget)}
          onOpenChange={(open) => !open && setRescheduleTarget(null)}
          appointmentId={rescheduleTarget.id}
          physioId={rescheduleTarget.physiotherapist_id}
          physioName={rescheduleTarget.physiotherapists?.full_name ?? "physiotherapist"}
          onRescheduled={() => {
            setRescheduleTarget(null);
            refresh();
          }}
        />
      )}

      {cancelTarget && (
        <CancelDialog
          open={Boolean(cancelTarget)}
          onOpenChange={(open) => !open && setCancelTarget(null)}
          appointmentId={cancelTarget.id}
          onCancelled={() => {
            setCancelTarget(null);
            refresh();
          }}
        />
      )}

      {editTarget && (
        <EditDialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => !open && setEditTarget(null)}
          appointmentId={editTarget.id}
          currentNotes={editTarget.notes}
          currentStatus={editTarget.status}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
