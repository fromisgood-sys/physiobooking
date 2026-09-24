import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import {
  CLINIC_TZ,
  CLINIC_OPEN,
  CLINIC_CLOSE,
  SESSION_MINUTES,
  DEFAULT_LEAD_TIME_MINUTES,
  weekdayOfDateLabel,
} from "./tz";

export interface AvailabilityRule {
  weekday: number; // 0 = Sunday .. 6 = Saturday
  start_time: string; // "HH:mm" or "HH:mm:ss", clinic-local
  end_time: string;
}

export interface TimeOffBlock {
  starts_at: string; // ISO UTC
  ends_at: string; // ISO UTC
}

export interface ExistingAppointment {
  starts_at: string; // ISO UTC
  ends_at: string; // ISO UTC
}

export interface Slot {
  /** UTC ISO instant the session starts */
  startUtc: string;
  /** UTC ISO instant the session ends */
  endUtc: string;
  /** Clinic-local "HH:mm" label for display */
  label: string;
}

export interface GenerateSlotsParams {
  /** Calendar date in clinic-local terms, "yyyy-MM-dd" */
  date: string;
  availabilityRules: AvailabilityRule[];
  /** Non-cancelled appointments for this physiotherapist */
  appointments?: ExistingAppointment[];
  timeOff?: TimeOffBlock[];
  /** Injectable for tests; defaults to the real current time */
  now?: Date;
  leadTimeMinutes?: number;
  /** IANA zone to interpret `date` and rule times in. Defaults to CLINIC_TZ. */
  timezone?: string;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Generates the free 45-minute slots for one physiotherapist on one
 * clinic-local calendar date, per physio-booking-app-spec.md section 7.
 */
export function generateSlots(params: GenerateSlotsParams): Slot[] {
  const {
    date,
    availabilityRules,
    appointments = [],
    timeOff = [],
    now = new Date(),
    leadTimeMinutes = DEFAULT_LEAD_TIME_MINUTES,
    timezone = CLINIC_TZ,
  } = params;

  const todayLabel = format(toZonedTime(now, timezone), "yyyy-MM-dd");

  // Past dates are never bookable.
  if (date < todayLabel) return [];

  const cutoff =
    date === todayLabel ? new Date(now.getTime() + leadTimeMinutes * 60_000) : null;

  const weekday = weekdayOfDateLabel(date);
  const openMin = timeToMinutes(CLINIC_OPEN);
  const closeMin = timeToMinutes(CLINIC_CLOSE);

  const todaysRules = availabilityRules.filter((r) => r.weekday === weekday);

  const busy = [
    ...appointments.map((a) => ({
      start: new Date(a.starts_at),
      end: new Date(a.ends_at),
    })),
    ...timeOff.map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
  ];

  const slots: Slot[] = [];

  for (const rule of todaysRules) {
    // Clamp every rule to the hard clinic window (08:00–17:00), regardless
    // of what the rule itself says — this is a non-negotiable domain rule,
    // not just a DB constraint.
    const ruleStart = Math.max(timeToMinutes(rule.start_time), openMin);
    const ruleEnd = Math.min(timeToMinutes(rule.end_time), closeMin);

    for (let t = ruleStart; t + SESSION_MINUTES <= ruleEnd; t += SESSION_MINUTES) {
      const startLabel = minutesToTime(t);
      const startUtc = fromZonedTime(`${date}T${startLabel}:00`, timezone);
      const endUtc = new Date(startUtc.getTime() + SESSION_MINUTES * 60_000);

      if (cutoff && startUtc < cutoff) continue;
      if (busy.some((b) => overlaps(startUtc, endUtc, b.start, b.end))) continue;

      slots.push({
        startUtc: startUtc.toISOString(),
        endUtc: endUtc.toISOString(),
        label: startLabel,
      });
    }
  }

  return slots;
}
