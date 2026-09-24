"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Rule {
  weekday: number;
  start_time: string;
  end_time: string;
}

interface TimeOffRow {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

type DayRule = { start: string; end: string } | null;

export function AvailabilityEditor({ physioId }: { physioId: string }) {
  const [rules, setRules] = useState<Record<number, DayRule>>({});
  const [timeOff, setTimeOff] = useState<TimeOffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTimeOff, setNewTimeOff] = useState({ start: "", end: "", reason: "" });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/availability?physioId=${physioId}`)
      .then((res) => res.json())
      .then((data: { rules: Rule[]; timeOff: TimeOffRow[] }) => {
        const map: Record<number, DayRule> = {};
        for (let d = 0; d < 7; d++) map[d] = null;
        for (const r of data.rules ?? []) {
          map[r.weekday] = { start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) };
        }
        setRules(map);
        setTimeOff(data.timeOff ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [physioId]);

  async function saveRules() {
    setSaving(true);
    setError(null);

    const payload = Object.entries(rules)
      .filter((entry): entry is [string, { start: string; end: string }] => Boolean(entry[1]))
      .map(([weekday, v]) => ({ weekday: Number(weekday), start_time: v.start, end_time: v.end }));

    const res = await fetch("/api/admin/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ physioId, rules: payload }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setError(data.error ?? "Could not save.");
  }

  async function addTimeOff() {
    if (!newTimeOff.start || !newTimeOff.end) return;

    const res = await fetch("/api/admin/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        physioId,
        startsAt: new Date(newTimeOff.start).toISOString(),
        endsAt: new Date(newTimeOff.end).toISOString(),
        reason: newTimeOff.reason || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setTimeOff((t) => [...t, data.timeOff]);
      setNewTimeOff({ start: "", end: "", reason: "" });
    }
  }

  async function removeTimeOff(id: string) {
    await fetch(`/api/admin/time-off?id=${id}`, { method: "DELETE" });
    setTimeOff((t) => t.filter((r) => r.id !== id));
  }

  if (loading) return <p className="mt-8 text-[15px] text-ink-soft">Loading&hellip;</p>;

  return (
    <div className="mt-8 flex flex-col gap-10">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">Weekly availability</h2>
        <div className="mt-4 flex flex-col gap-3">
          {WEEKDAYS.map((label, weekday) => {
            const rule = rules[weekday];
            return (
              <div key={weekday} className="flex items-center gap-4">
                <label className="flex w-32 items-center gap-2 text-[15px] text-ink">
                  <input
                    type="checkbox"
                    checked={Boolean(rule)}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        [weekday]: e.target.checked ? { start: "08:00", end: "17:00" } : null,
                      }))
                    }
                  />
                  {label}
                </label>
                {rule && (
                  <>
                    <input
                      type="time"
                      value={rule.start}
                      onChange={(e) =>
                        setRules((r) => ({ ...r, [weekday]: { ...rule, start: e.target.value } }))
                      }
                      className="h-10 rounded-btn border border-line-strong bg-paper px-2 text-[15px] tabular-nums text-ink"
                    />
                    <span className="text-ink-soft">to</span>
                    <input
                      type="time"
                      value={rule.end}
                      onChange={(e) =>
                        setRules((r) => ({ ...r, [weekday]: { ...rule, end: e.target.value } }))
                      }
                      className="h-10 rounded-btn border border-line-strong bg-paper px-2 text-[15px] tabular-nums text-ink"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-[15px] text-state-danger">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={saveRules}
          className="mt-4 flex h-11 items-center justify-center rounded-btn bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save weekly availability"}
        </button>
      </div>

      <div>
        <h2 className="text-[18px] font-semibold text-ink">Time off</h2>

        <div className="mt-4 flex flex-col gap-3">
          {timeOff.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-card border border-line bg-paper p-4"
            >
              <p className="text-[15px] text-ink">
                {new Date(t.starts_at).toLocaleString()} &ndash;{" "}
                {new Date(t.ends_at).toLocaleString()}
                {t.reason && <span className="text-ink-soft"> &middot; {t.reason}</span>}
              </p>
              <button
                type="button"
                onClick={() => removeTimeOff(t.id)}
                className="text-[15px] font-medium text-state-danger hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          {timeOff.length === 0 && (
            <p className="text-[15px] text-ink-soft">No time off scheduled.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              Start
            </label>
            <input
              type="datetime-local"
              value={newTimeOff.start}
              onChange={(e) => setNewTimeOff({ ...newTimeOff, start: e.target.value })}
              className="h-10 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              End
            </label>
            <input
              type="datetime-local"
              value={newTimeOff.end}
              onChange={(e) => setNewTimeOff({ ...newTimeOff, end: e.target.value })}
              className="h-10 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              Reason
            </label>
            <input
              type="text"
              value={newTimeOff.reason}
              onChange={(e) => setNewTimeOff({ ...newTimeOff, reason: e.target.value })}
              className="h-10 rounded-btn border border-line-strong bg-paper px-3 text-[15px] text-ink"
            />
          </div>
          <button
            type="button"
            onClick={addTimeOff}
            className="flex h-10 items-center justify-center rounded-btn bg-azure px-4 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
