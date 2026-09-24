import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { CalendarDays, CalendarRange, CalendarX2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CLINIC_TZ } from "@/lib/tz";
import { StatTile } from "@/components/admin/StatTile";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const localNow = toZonedTime(new Date(), CLINIC_TZ);

  const dayStart = fromZonedTime(startOfDay(localNow), CLINIC_TZ).toISOString();
  const dayEnd = fromZonedTime(endOfDay(localNow), CLINIC_TZ).toISOString();
  const weekStart = fromZonedTime(startOfWeek(localNow, { weekStartsOn: 1 }), CLINIC_TZ).toISOString();
  const weekEnd = fromZonedTime(endOfWeek(localNow, { weekStartsOn: 1 }), CLINIC_TZ).toISOString();
  const monthStart = fromZonedTime(startOfMonth(localNow), CLINIC_TZ).toISOString();
  const monthEnd = fromZonedTime(endOfMonth(localNow), CLINIC_TZ).toISOString();

  const [{ count: todayCount }, { count: weekCount }, { count: cancelledThisMonth }, { data: loadRows }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .neq("status", "cancelled")
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .neq("status", "cancelled")
        .gte("starts_at", weekStart)
        .lte("starts_at", weekEnd),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelled")
        .gte("starts_at", monthStart)
        .lte("starts_at", monthEnd),
      supabase
        .from("appointments")
        .select("physiotherapist_id, physiotherapists(full_name)")
        .neq("status", "cancelled")
        .gte("starts_at", weekStart)
        .lte("starts_at", weekEnd),
    ]);

  const loadByPhysio = new Map<string, { name: string; count: number }>();
  for (const row of (loadRows ?? []) as unknown as {
    physiotherapist_id: string;
    physiotherapists: { full_name: string } | null;
  }[]) {
    const key = row.physiotherapist_id;
    const name = row.physiotherapists?.full_name ?? "Unknown";
    const entry = loadByPhysio.get(key);
    if (entry) entry.count += 1;
    else loadByPhysio.set(key, { name, count: 1 });
  }
  const physioLoad = Array.from(loadByPhysio.values()).sort((a, b) => b.count - a.count);

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Dashboard
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatTile label="Appointments today" value={todayCount ?? 0} icon={CalendarDays} />
        <StatTile label="Appointments this week" value={weekCount ?? 0} icon={CalendarRange} />
        <StatTile
          label="Cancellations this month"
          value={cancelledThisMonth ?? 0}
          icon={CalendarX2}
        />
      </div>

      <h2 className="mt-12 text-[18px] font-semibold leading-6 tracking-[-0.01em] text-ink">
        Load this week, by physiotherapist
      </h2>

      {physioLoad.length === 0 ? (
        <p className="mt-4 text-[15px] text-ink-soft">No appointments booked this week.</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-line rounded-card border border-line bg-paper">
          {physioLoad.map((p) => (
            <div key={p.name} className="flex items-center justify-between px-5 py-3">
              <span className="text-[15px] text-ink">{p.name}</span>
              <span className="text-[15px] font-medium tabular-nums text-ink">{p.count}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
