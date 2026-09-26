"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  BadgeCheck,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  UserRoundPlus,
} from "lucide-react";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { addDaysToDateLabel, CLINIC_TZ } from "@/lib/tz";

export interface DashboardPhysio {
  id: string;
  full_name: string;
  specialisation: string | null;
  is_active: boolean;
}

export interface DashboardAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reason_for_visit: string | null;
  physiotherapist_id: string;
  patient: { full_name: string | null; email: string; phone: string | null } | null;
  physiotherapists: { id: string; full_name: string; specialisation: string | null } | null;
}

export interface DashboardMetrics {
  appointmentsToday: number | null;
  upcomingSevenDays: number | null;
  newPatients: number | null;
  cancellations: number | null;
  completed: number | null;
}

const HOUR_HEIGHT = 66;
const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 17 * 60;
const HOURS = Array.from({ length: DAY_END_MINUTES / 60 - DAY_START_MINUTES / 60 + 1 }, (_, index) => index + 8);
const TIME_FILTERS = [
  { value: "all", label: "All Times", start: 0, end: 24 * 60 },
  { value: "morning", label: "Morning (08:00 - 12:00)", start: 8 * 60, end: 12 * 60 },
  { value: "noon", label: "Noon (12:00 - 13:30)", start: 12 * 60, end: 13 * 60 + 30 },
  { value: "afternoon", label: "Afternoon (13:30 - 17:00)", start: 13 * 60 + 30, end: 17 * 60 },
] as const;

const STATUS_SURFACE: Record<string, string> = {
  confirmed: "border-[#80c6c3] bg-[#eaf7f6]",
  rescheduled: "border-[#8bb3e6] bg-[#eef5fd]",
  completed: "border-[#a4c9af] bg-[#eff7f0]",
  cancelled: "border-[#e2b1ab] bg-[#fff2ef]",
  no_show: "border-[#d7a6a0] bg-[#fff1ef]",
};

const METRIC_CONFIG = [
  { key: "appointmentsToday", label: "Appointments Today", icon: CalendarDays, tint: "bg-[#e4f5f2] text-[#148b86]" },
  { key: "upcomingSevenDays", label: "Upcoming (7 Days)", icon: CalendarRange, tint: "bg-[#e9f0fc] text-[#4b78c7]" },
  { key: "newPatients", label: "New Patients (This Month)", icon: UserRoundPlus, tint: "bg-[#f0ebfb] text-[#7956bb]" },
  { key: "cancellations", label: "Cancellations (This Month)", icon: CircleX, tint: "bg-[#fff1e5] text-[#c17a2a]" },
  { key: "completed", label: "Completed (This Month)", icon: BadgeCheck, tint: "bg-[#e9f5eb] text-[#468b59]" },
] as const;

type PositionedAppointment = { appointment: DashboardAppointment; column: number; columns: number };

function positionOverlaps(appointments: DashboardAppointment[]): PositionedAppointment[] {
  const sorted = [...appointments].sort((first, second) => first.starts_at.localeCompare(second.starts_at));
  const positioned: PositionedAppointment[] = [];
  let cluster: { appointment: DashboardAppointment; column: number }[] = [];

  const flush = () => {
    const columns = Math.max(1, ...cluster.map((item) => item.column + 1));
    for (const item of cluster) positioned.push({ ...item, columns });
    cluster = [];
  };

  for (const appointment of sorted) {
    if (cluster.length && cluster.every((item) => item.appointment.ends_at <= appointment.starts_at)) flush();
    const occupied = new Set(cluster.filter((item) => item.appointment.ends_at > appointment.starts_at).map((item) => item.column));
    let column = 0;
    while (occupied.has(column)) column += 1;
    cluster.push({ appointment, column });
  }
  if (cluster.length) flush();
  return positioned;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export function DashboardWorkspace({
  selectedDate,
  clinicToday,
  appointments,
  physiotherapists,
  queryError,
  metrics,
}: {
  selectedDate: string;
  clinicToday: string;
  appointments: DashboardAppointment[];
  physiotherapists: DashboardPhysio[];
  queryError: boolean;
  metrics: DashboardMetrics;
}) {
  const router = useRouter();
  const [timeFilter, setTimeFilter] = useState<(typeof TIME_FILTERS)[number]["value"]>("all");
  const [physioFilter, setPhysioFilter] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const date = toZonedTime(fromZonedTime(`${selectedDate}T12:00:00`, CLINIC_TZ), CLINIC_TZ);
  const dateLabel = format(date, "EEEE, d MMMM yyyy");
  const activeTimeFilter = TIME_FILTERS.find((filter) => filter.value === timeFilter) ?? TIME_FILTERS[0];

  function navigateDate(nextDate: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("date", nextDate);
    router.push(`/admin?${params.toString()}`, { scroll: false });
  }

  const activeAppointments = appointments.filter((appointment) => appointment.status !== "cancelled");
  const nextAppointments = activeAppointments
    .filter((appointment) => selectedDate !== clinicToday || new Date(appointment.starts_at) >= new Date())
    .sort((first, second) => first.starts_at.localeCompare(second.starts_at));

  const visibleAppointments = useMemo(() => {
    return nextAppointments.filter((appointment) => {
      if (physioFilter && appointment.physiotherapist_id !== physioFilter) return false;
      const localStart = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
      const minutes = localStart.getHours() * 60 + localStart.getMinutes();
      return minutes >= activeTimeFilter.start && minutes < activeTimeFilter.end;
    });
  }, [nextAppointments, physioFilter, activeTimeFilter]);

  const shownPhysios = physioFilter
    ? physiotherapists.filter((physio) => physio.id === physioFilter)
    : physiotherapists;

  return (
    <main className="mx-auto w-full max-w-[1440px] px-1 py-2 sm:px-2 lg:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-bold leading-8 tracking-[-0.025em] text-[#142b42] sm:text-[28px]">Dashboard</h1>
          <p className="mt-1 text-[13px] text-[#617386]">Overview of your clinic’s appointments and bookings.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous day" onClick={() => navigateDate(addDaysToDateLabel(selectedDate, -1))} className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dce4e9] bg-white text-[#4d6578] hover:bg-[#f2f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8acbca]">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <label className="sr-only" htmlFor="dashboard-date">Dashboard date</label>
          <input id="dashboard-date" type="date" value={selectedDate} onChange={(event) => event.target.value && navigateDate(event.target.value)} className="h-10 rounded-[8px] border border-[#dce4e9] bg-white px-3 text-[12px] font-medium text-[#304b60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8acbca]" />
          <button type="button" aria-label="Next day" onClick={() => navigateDate(addDaysToDateLabel(selectedDate, 1))} className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dce4e9] bg-white text-[#4d6578] hover:bg-[#f2f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8acbca]">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {queryError && <p role="alert" className="mt-4 rounded-[9px] border border-[#f0d6d3] bg-[#fff3f1] px-3 py-2 text-[12px] text-[#a73730]">Some dashboard data could not be loaded. Refresh to try again.</p>}

      <section aria-label="Clinic metrics" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {METRIC_CONFIG.map(({ key, label, icon: Icon, tint }) => (
          <article key={key} className="min-w-0 rounded-[11px] border border-[#e0e7ec] bg-white p-4 shadow-[0_2px_8px_rgba(23,50,70,0.035)]">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tint}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <p className="text-[11px] font-medium leading-4 text-[#65798a]">{label}</p>
            </div>
            <p className="mt-3 text-[26px] font-bold leading-8 tabular-nums text-[#172e44]">{metrics[key] ?? "—"}</p>
          </article>
        ))}
      </section>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="dashboard-appointments-title" className="min-w-0 rounded-[11px] border border-[#e0e7ec] bg-white shadow-[0_2px_8px_rgba(23,50,70,0.035)]">
          <div className="border-b border-[#e8edf0] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="dashboard-appointments-title" className="text-[15px] font-bold text-[#20394e]">Appointments</h2>
              <Link href="/admin/appointments" className="text-[11px] font-semibold text-[#087f83] hover:underline">View all</Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-[#748697]">Time</span>
                <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as typeof timeFilter)} className="h-9 w-full rounded-[7px] border border-[#dce4e9] bg-white px-2 text-[11px] text-[#3d586b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8acbca]">
                  {TIME_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-[#748697]">Physiotherapist</span>
                <select value={physioFilter} onChange={(event) => setPhysioFilter(event.target.value)} className="h-9 w-full rounded-[7px] border border-[#dce4e9] bg-white px-2 text-[11px] text-[#3d586b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8acbca]">
                  <option value="">All Physiotherapists</option>
                  {physiotherapists.map((physio) => <option key={physio.id} value={physio.id}>{physio.full_name}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="max-h-[560px] space-y-4 overflow-y-auto p-3 sm:p-4">
            {visibleAppointments.length === 0 ? (
              <p className="rounded-[8px] bg-[#f7f9fa] px-3 py-5 text-center text-[12px] text-[#708495]">No appointments match these filters.</p>
            ) : (
              <AppointmentGroup title="Appointments" appointments={visibleAppointments} selectedId={selectedAppointmentId} onSelect={setSelectedAppointmentId} />
            )}
          </div>
        </section>

        <section aria-labelledby="dashboard-schedule-title" className="min-w-0 rounded-[11px] border border-[#e0e7ec] bg-white shadow-[0_2px_8px_rgba(23,50,70,0.035)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf0] px-4 py-4">
            <div>
              <h2 id="dashboard-schedule-title" className="text-[15px] font-bold text-[#20394e]">Schedule</h2>
              <p className="mt-1 text-[11px] text-[#778a99]">{dateLabel}</p>
            </div>
            <div className="flex items-center gap-1 rounded-[8px] bg-[#f1f5f6] p-1" role="group" aria-label="Schedule date navigation">
              <button type="button" aria-label="Previous day" onClick={() => navigateDate(addDaysToDateLabel(selectedDate, -1))} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#536b7d] hover:bg-white"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={() => navigateDate(clinicToday)} className={`h-8 rounded-[6px] px-2 text-[10px] font-semibold ${selectedDate === clinicToday ? "bg-[#087f83] text-white" : "text-[#536b7d] hover:bg-white"}`}>Today</button>
              <span className="rounded-[6px] bg-[#087f83] px-2 py-2 text-[10px] font-semibold text-white">Day</span>
              <button type="button" aria-label="Next day" onClick={() => navigateDate(addDaysToDateLabel(selectedDate, 1))} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#536b7d] hover:bg-white"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>

          {physiotherapists.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12px] text-[#708495]">No active physiotherapists are available.</p>
          ) : (
            <>
              {visibleAppointments.length === 0 && <p className="px-4 pt-3 text-[11px] text-[#718596]">No appointments scheduled for this date and filter.</p>}
              <DailySchedule physiotherapists={shownPhysios} appointments={visibleAppointments} selectedId={selectedAppointmentId} onSelect={setSelectedAppointmentId} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function AppointmentGroup({
  title,
  appointments,
  selectedId,
  onSelect,
}: {
  title: string;
  appointments: DashboardAppointment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#344f64]"><span className="h-2 w-2 rounded-full bg-[#f0aa4b]" aria-hidden="true" />{title} <span className="rounded-full bg-[#e9f3f2] px-1.5 py-0.5 text-[9px] text-[#237f7d]">{appointments.length}</span></h3>
      <ul className="space-y-2">
        {appointments.map((appointment) => {
          const patientName = appointment.patient?.full_name ?? appointment.patient?.email ?? "Patient";
          const therapist = appointment.physiotherapists?.full_name ?? "Physiotherapist";
          const localStart = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
          const localEnd = toZonedTime(new Date(appointment.ends_at), CLINIC_TZ);
          const active = selectedId === appointment.id;
          return (
            <li key={appointment.id}>
              <button type="button" aria-pressed={active} onClick={() => onSelect(appointment.id)} className={`flex min-h-[74px] w-full items-center gap-2.5 rounded-[8px] border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84c9c8] ${active ? "border-[#55afb0] bg-[#f0fafa]" : "border-[#e5ebee] bg-white hover:bg-[#f8fbfb]"}`}>
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f2f5] text-[10px] font-semibold text-[#42657a]">{initials(patientName)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-[#20394e]">{patientName}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#718596]">{therapist}{appointment.physiotherapists?.specialisation ? ` · ${appointment.physiotherapists.specialisation}` : ""}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-[#587083]">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3 text-[#16888b]" aria-hidden="true" />{format(localStart, "HH:mm")}–{format(localEnd, "HH:mm")}</span>
                    {appointment.reason_for_visit && <span className="truncate">{appointment.reason_for_visit}</span>}
                  </span>
                </span>
                <span className="shrink-0"><StatusBadge status={appointment.status} /></span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DailySchedule({
  physiotherapists,
  appointments,
  selectedId,
  onSelect,
}: {
  physiotherapists: DashboardPhysio[];
  appointments: DashboardAppointment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[580px]">
        <div className="grid border-b border-[#edf1f3]" style={{ gridTemplateColumns: `52px repeat(${physiotherapists.length}, minmax(150px, 1fr))` }}>
          <div className="px-2 py-3 text-[9px] text-[#8a9aa6]">Time</div>
          {physiotherapists.map((physio) => (
            <div key={physio.id} className="border-l border-[#edf1f3] px-2 py-2.5 text-center">
              <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f1f4] text-[9px] font-semibold text-[#466a7e]">{initials(physio.full_name)}</span>
              <span className="mt-1 block truncate text-[10px] font-semibold text-[#345066]">{physio.full_name}</span>
              <span className="block truncate text-[9px] text-[#80919d]">{physio.specialisation ?? ""}</span>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `52px repeat(${physiotherapists.length}, minmax(150px, 1fr))` }}>
          <div className="relative" style={{ height: 9 * HOUR_HEIGHT }}>
            {HOURS.map((hour) => <span key={hour} className="absolute right-2 -translate-y-1/2 text-[9px] tabular-nums text-[#82939f]" style={{ top: (hour - 8) * HOUR_HEIGHT }}>{String(hour).padStart(2, "0")}:00</span>)}
          </div>
          {physiotherapists.map((physio) => (
            <ScheduleColumn key={physio.id} appointments={appointments.filter((appointment) => appointment.physiotherapist_id === physio.id)} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScheduleColumn({
  appointments,
  selectedId,
  onSelect,
}: {
  appointments: DashboardAppointment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const positioned = positionOverlaps(appointments);
  return (
    <div className="relative border-l border-[#edf1f3]" style={{ height: 9 * HOUR_HEIGHT }}>
      {HOURS.slice(0, -1).map((hour) => <div key={hour} className="absolute inset-x-0 border-t border-[#edf1f3]" style={{ top: (hour - 8) * HOUR_HEIGHT }} />)}
      {positioned.map(({ appointment, column, columns }) => {
        const localStart = toZonedTime(new Date(appointment.starts_at), CLINIC_TZ);
        const localEnd = toZonedTime(new Date(appointment.ends_at), CLINIC_TZ);
        const startMinutes = localStart.getHours() * 60 + localStart.getMinutes();
        const top = ((startMinutes - DAY_START_MINUTES) / 60) * HOUR_HEIGHT;
        const height = Math.max(44, ((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 3_600_000) * HOUR_HEIGHT - 3);
        const active = selectedId === appointment.id;
        return (
          <button key={appointment.id} type="button" aria-pressed={active} onClick={() => onSelect(appointment.id)} className={`absolute overflow-hidden rounded-[7px] border p-1.5 text-left shadow-[0_1px_3px_rgba(18,54,68,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#77c2c3] ${STATUS_SURFACE[appointment.status] ?? STATUS_SURFACE.confirmed} ${active ? "ring-2 ring-[#087f83]" : ""}`} style={{ top, height, left: `calc(${column / columns * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }}>
            <span className="block truncate text-[9px] font-semibold text-[#20394e]">{format(localStart, "HH:mm")}–{format(localEnd, "HH:mm")}</span>
            <span className="block truncate text-[10px] font-semibold text-[#20394e]">{appointment.patient?.full_name ?? appointment.patient?.email ?? "Patient"}</span>
            {height > 48 && appointment.reason_for_visit && <span className="block truncate text-[9px] text-[#617587]">{appointment.reason_for_visit}</span>}
          </button>
        );
      })}
    </div>
  );
}
