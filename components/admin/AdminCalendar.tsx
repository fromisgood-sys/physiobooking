"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { RescheduleDialog } from "@/components/appointments/RescheduleDialog";
import { CancelDialog } from "@/components/appointments/CancelDialog";
import { EditDialog } from "@/components/admin/EditDialog";
import { CLINIC_TZ, addDaysToDateLabel, weekdayOfDateLabel } from "@/lib/tz";

interface Apt {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reason_for_visit: string | null;
  notes: string | null;
  physiotherapist_id: string;
  patient: { full_name: string | null; email: string; phone: string | null } | null;
  physiotherapists: { full_name: string } | null;
}

interface Physio {
  id: string;
  full_name: string;
  specialisation: string | null;
  is_active: boolean;
}

const START_HOUR = 8;
const END_HOUR = 17;
const HOUR_PX = 72;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACTIVE = ["confirmed", "rescheduled"];

const BLOCK_STYLE: Record<string, string> = {
  confirmed: "border-azure bg-azure-soft",
  rescheduled: "border-state-warn bg-state-warn-soft",
  completed: "border-state-ok bg-state-ok-soft",
  cancelled: "border-state-danger bg-state-danger-soft opacity-60",
  no_show: "border-dashed border-state-danger bg-paper",
};

const todayLabel = () => format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd");
const mondayOf = (label: string) => addDaysToDateLabel(label, -((weekdayOfDateLabel(label) + 6) % 7));

function addMonths(label: string, n: number) {
  const [y, m] = label.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function layoutDay(apts: Apt[]) {
  const sorted = [...apts].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const out: { apt: Apt; col: number; cols: number }[] = [];
  let cluster: { apt: Apt; col: number; end: string }[] = [];
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    cluster.forEach((c) => out.push({ apt: c.apt, col: c.col, cols }));
    cluster = [];
  };
  for (const apt of sorted) {
    if (cluster.length && cluster.every((c) => c.end <= apt.starts_at)) flush();
    const used = new Set(cluster.filter((c) => c.end > apt.starts_at).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ apt, col, end: apt.ends_at });
  }
  if (cluster.length) flush();
  return out;
}

export function AdminCalendar() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayLabel()));
  const [month, setMonth] = useState(() => todayLabel().slice(0, 7));
  const [physioId, setPhysioId] = useState("");
  const [physios, setPhysios] = useState<Physio[]>([]);
  const [apts, setApts] = useState<Apt[] | null>(null);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<Apt | null>(null);
  const [reschedule, setReschedule] = useState<Apt | null>(null);
  const [cancel, setCancel] = useState<Apt | null>(null);
  const [edit, setEdit] = useState<Apt | null>(null);

  const weekEnd = addDaysToDateLabel(weekStart, 6);

  const load = useCallback(() => {
    setApts(null);
    setError(false);
    const params = new URLSearchParams({ dateFrom: weekStart, dateTo: weekEnd, all: "1", sortBy: "starts_at", sortDir: "asc" });
    if (physioId) params.set("physioId", physioId);
    fetch(`/api/admin/appointments?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setApts(d.rows ?? []))
      .catch(() => {
        setApts([]);
        setError(true);
      });
  }, [weekStart, weekEnd, physioId]);

  useEffect(load, [load]);

  useEffect(() => {
    fetch("/api/admin/physiotherapists")
      .then((r) => r.json())
      .then((d) => setPhysios(d.physiotherapists ?? []))
      .catch(() => setPhysios([]));
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateLabel(weekStart, i));
  const today = todayLabel();

  const byDay = useMemo(() => {
    const map = new Map<string, Apt[]>();
    for (const a of apts ?? []) {
      const key = format(toZonedTime(new Date(a.starts_at), CLINIC_TZ), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [apts]);

  const now = toZonedTime(new Date(), CLINIC_TZ);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = days.includes(today) && nowMinutes >= START_HOUR * 60 && nowMinutes < END_HOUR * 60;

  // Mini month calendar cells (Mon-first, 6 rows).
  const first = `${month}-01`;
  const gridStart = addDaysToDateLabel(first, -((weekdayOfDateLabel(first) + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDaysToDateLabel(gridStart, i));

  async function quick(a: Apt, status: "completed" | "no_show") {
    await fetch(`/api/appointments/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setDetail(null);
    load();
  }

  const rangeLabel = `${format(new Date(`${weekStart}T00:00:00`), "d MMM")} – ${format(new Date(`${weekEnd}T00:00:00`), "d MMM yyyy")}`;

  return (
    <div className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[280px_1fr]">
      {/* Left rail */}
      <aside className="border-b border-line lg:border-r lg:border-b-0">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">
              {format(new Date(`${month}-01T00:00:00`), "MMMM yyyy")}
            </h2>
            <div className="flex gap-1">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-tint text-ink-soft hover:bg-azure-soft">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-tint text-ink-soft hover:bg-azure-soft">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
            {DAY_LABELS.map((d) => (
              <span key={d} className="py-1">{d[0]}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {cells.map((c) => {
              const inWeek = c >= weekStart && c <= weekEnd;
              const isToday = c === today;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setWeekStart(mondayOf(c))}
                  aria-label={c}
                  className={`h-8 text-[13px] tabular-nums transition-colors duration-150 ease-out ${
                    inWeek ? "bg-azure-soft" : ""
                  } ${c === weekStart ? "rounded-l-full" : ""} ${c === weekEnd ? "rounded-r-full" : ""} ${
                    isToday ? "font-bold text-azure-hover" : c.startsWith(month) ? "text-ink" : "text-ink-muted/60"
                  } hover:bg-azure-soft`}
                >
                  {Number(c.slice(-2))}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line p-5">
          <h2 className="text-[15px] font-semibold text-ink">Physiotherapists</h2>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              <button type="button" onClick={() => setPhysioId("")} className={`flex w-full items-center gap-3 rounded-btn px-3 py-2 text-left text-[14px] font-medium ${physioId === "" ? "bg-azure-soft text-ink" : "text-ink-soft hover:bg-paper-tint"}`}>
                All physiotherapists
              </button>
            </li>
            {physios.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setPhysioId(p.id)} className={`flex w-full items-center gap-3 rounded-btn px-3 py-2 text-left ${physioId === p.id ? "bg-azure-soft" : "hover:bg-paper-tint"}`}>
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-[12px] font-semibold text-azure-hover">
                    {p.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{p.full_name}</span>
                    <span className="block truncate text-[12px] text-azure-hover">{p.specialisation ?? "—"}{p.is_active ? "" : " · inactive"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Week grid */}
      <section className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[17px] font-semibold text-ink tabular-nums">{rangeLabel}</h2>
          <button type="button" onClick={() => setWeekStart(mondayOf(today))} className="h-9 rounded-full border border-azure-ring px-4 text-[14px] font-medium text-azure-hover hover:bg-azure-soft">
            Today
          </button>
          <button type="button" aria-label="Previous week" onClick={() => setWeekStart(addDaysToDateLabel(weekStart, -7))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-tint">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next week" onClick={() => setWeekStart(addDaysToDateLabel(weekStart, 7))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-tint">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <ul className="ml-auto hidden items-center gap-4 text-[12px] text-ink-soft xl:flex">
            {[["confirmed", "Confirmed"], ["rescheduled", "Rescheduled"], ["completed", "Completed"], ["cancelled", "Cancelled"]].map(([k, l]) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-[3px] border ${BLOCK_STYLE[k]}`} aria-hidden="true" />
                {l}
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="px-5 pt-4 text-[15px] text-state-danger">Couldn&rsquo;t load this week. Try again.</p>}

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line">
              <div />
              {days.map((d, i) => (
                <div key={d} className={`px-2 py-3 text-center ${d === today ? "text-azure-hover" : "text-ink-soft"}`}>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.06em]">{DAY_LABELS[i]}</span>
                  <span className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums ${d === today ? "bg-azure text-white" : "text-ink"}`}>
                    {Number(d.slice(-2))}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: HOURS.length * HOUR_PX }}>
              <div className="relative">
                {HOURS.map((h, i) => (
                  <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-ink-muted" style={{ top: i * HOUR_PX }}>
                    {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                  </span>
                ))}
              </div>

              {days.map((d, i) => (
                <div key={d} className={`relative border-l border-line ${i >= 5 ? "bg-paper-tint/60" : ""}`}>
                  {HOURS.map((h, r) => (
                    <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: r * HOUR_PX }} />
                  ))}
                  {layoutDay(byDay.get(d) ?? []).map(({ apt, col, cols }) => {
                    const s = toZonedTime(new Date(apt.starts_at), CLINIC_TZ);
                    const e = toZonedTime(new Date(apt.ends_at), CLINIC_TZ);
                    const top = ((s.getHours() * 60 + s.getMinutes() - START_HOUR * 60) / 60) * HOUR_PX;
                    const height = ((e.getTime() - s.getTime()) / 3_600_000) * HOUR_PX - 2;
                    return (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() => setDetail(apt)}
                        className={`absolute overflow-hidden rounded-btn border px-2 py-1 text-left transition-shadow duration-150 ease-out hover:shadow-[var(--shadow-float)] ${BLOCK_STYLE[apt.status] ?? BLOCK_STYLE.confirmed}`}
                        style={{ top, height, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)` }}
                      >
                        <span className="block truncate text-[12px] font-semibold text-ink">{apt.patient?.full_name ?? apt.patient?.email ?? "Patient"}</span>
                        <span className="block truncate text-[11px] tabular-nums text-ink-soft">
                          {format(s, "HH:mm")} – {format(e, "HH:mm")}
                        </span>
                        {height > 52 && <span className="block truncate text-[11px] text-azure-hover">{apt.physiotherapists?.full_name}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}

              {showNow && (
                <div className="pointer-events-none absolute right-0 left-[56px] z-10 border-t-2 border-dotted border-azure" style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * HOUR_PX }} aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        {apts && apts.length === 0 && !error && (
          <p className="px-5 py-4 text-[15px] text-ink-soft">No appointments this week.</p>
        )}
      </section>

      {/* Detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.patient?.full_name ?? detail.patient?.email ?? "Appointment"}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2 text-[14px] text-ink-soft">
                <StatusBadge status={detail.status} />
                <p className="tabular-nums text-ink">
                  {format(toZonedTime(new Date(detail.starts_at), CLINIC_TZ), "EEE d MMM · HH:mm")} – {format(toZonedTime(new Date(detail.ends_at), CLINIC_TZ), "HH:mm")}
                </p>
                <p>With {detail.physiotherapists?.full_name ?? "—"}</p>
                <p>{detail.patient?.email} · {detail.patient?.phone ?? "no phone"}</p>
                {detail.reason_for_visit && <p>Reason: {detail.reason_for_visit}</p>}
                {detail.notes && <p>Notes: {detail.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {ACTIVE.includes(detail.status) && (
                  <button type="button" onClick={() => { setReschedule(detail); setDetail(null); }} className="h-10 rounded-btn border border-line-strong bg-paper px-4 text-[14px] font-medium text-ink hover:bg-paper-tint">Reschedule</button>
                )}
                <button type="button" onClick={() => { setEdit(detail); setDetail(null); }} className="h-10 rounded-btn border border-line-strong bg-paper px-4 text-[14px] font-medium text-ink hover:bg-paper-tint">Edit notes</button>
                {ACTIVE.includes(detail.status) && (
                  <>
                    <button type="button" onClick={() => quick(detail, "completed")} className="h-10 rounded-btn px-3 text-[14px] font-medium text-state-ok hover:bg-state-ok-soft">Mark completed</button>
                    <button type="button" onClick={() => quick(detail, "no_show")} className="h-10 rounded-btn px-3 text-[14px] font-medium text-state-warn hover:bg-state-warn-soft">Mark no-show</button>
                    <button type="button" onClick={() => { setCancel(detail); setDetail(null); }} className="h-10 rounded-btn px-3 text-[14px] font-medium text-state-danger hover:bg-state-danger-soft">Cancel</button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {reschedule && (
        <RescheduleDialog open onOpenChange={(o) => !o && setReschedule(null)} appointmentId={reschedule.id} physioId={reschedule.physiotherapist_id} physioName={reschedule.physiotherapists?.full_name ?? "physiotherapist"} onRescheduled={() => { setReschedule(null); load(); }} />
      )}
      {cancel && (
        <CancelDialog open onOpenChange={(o) => !o && setCancel(null)} appointmentId={cancel.id} onCancelled={() => { setCancel(null); load(); }} />
      )}
      {edit && (
        <EditDialog open onOpenChange={(o) => !o && setEdit(null)} appointmentId={edit.id} currentNotes={edit.notes} currentStatus={edit.status} onSaved={() => { setEdit(null); load(); }} />
      )}
    </div>
  );
}
