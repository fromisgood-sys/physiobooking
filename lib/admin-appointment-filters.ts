import { fromZonedTime } from "date-fns-tz";

export type AdminTimeOfDay = "all" | "morning" | "noon" | "afternoon";

const TIME_WINDOWS: Record<Exclude<AdminTimeOfDay, "all">, { start: string; end: string }> = {
  morning: { start: "08:00", end: "12:00" },
  noon: { start: "12:00", end: "13:30" },
  afternoon: { start: "13:30", end: "17:00" },
};

export function adminTimeWindowUtc(
  date: string,
  timeOfDay: AdminTimeOfDay,
  timezone: string
): { start: string; end: string } | null {
  if (timeOfDay === "all") return null;
  const window = TIME_WINDOWS[timeOfDay];
  return {
    start: fromZonedTime(`${date}T${window.start}:00`, timezone).toISOString(),
    end: fromZonedTime(`${date}T${window.end}:00`, timezone).toISOString(),
  };
}
