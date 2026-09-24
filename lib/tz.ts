export const CLINIC_TZ = process.env.NEXT_PUBLIC_CLINIC_TZ || "Africa/Windhoek";

export const CLINIC_OPEN = "08:00";
export const CLINIC_CLOSE = "17:00";
export const SESSION_MINUTES = 45;

export const DEFAULT_LEAD_TIME_MINUTES = Number(
  process.env.BOOKING_LEAD_TIME_MINUTES || 60
);

/** Day of week (0 = Sunday) for a "yyyy-MM-dd" calendar date, TZ-independent. */
export function weekdayOfDateLabel(dateLabel: string): number {
  const [y, m, d] = dateLabel.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Adds (or subtracts) whole calendar days to a "yyyy-MM-dd" label. */
export function addDaysToDateLabel(dateLabel: string, days: number): string {
  const [y, m, d] = dateLabel.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Every theoretical 45-minute slot start, "08:00" through "16:15". */
export function allSlotLabels(): string[] {
  const [openH, openM] = CLINIC_OPEN.split(":").map(Number);
  const [closeH, closeM] = CLINIC_CLOSE.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  const labels: string[] = [];
  for (let t = openMin; t + SESSION_MINUTES <= closeMin; t += SESSION_MINUTES) {
    labels.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return labels;
}
