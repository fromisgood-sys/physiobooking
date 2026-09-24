import { z } from "zod";
import { toZonedTime } from "date-fns-tz";
import { CLINIC_OPEN, CLINIC_CLOSE, SESSION_MINUTES } from "./tz";

export const createAppointmentSchema = z.object({
  physioId: z.string().uuid(),
  startUtc: z.string().datetime(),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(30),
  reasonForVisit: z.string().trim().max(500).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  startUtc: z.string().datetime(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const adminUpdateAppointmentSchema = z
  .object({
    startUtc: z.string().datetime().optional(),
    physioId: z.string().uuid().optional(),
    status: z.enum(["completed", "no_show"]).optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => v.startUtc || v.physioId || v.status || v.notes !== undefined, {
    message: "Provide at least one field to update",
  });

export type AdminUpdateAppointmentInput = z.infer<typeof adminUpdateAppointmentSchema>;

export const physiotherapistSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  specialisation: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  email: z.string().trim().email(),
  photo_url: z.string().url().optional(),
});

export const physiotherapistUpdateSchema = physiotherapistSchema
  .partial()
  .extend({ is_active: z.boolean().optional() });

export const weeklyRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const setAvailabilityRulesSchema = z.object({
  physioId: z.string().uuid(),
  rules: z.array(weeklyRuleSchema),
});

export const createTimeOffSchema = z.object({
  physioId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().trim().max(500).optional(),
});

/** True once `startUtc` is earlier than `now` plus the lead-time buffer. */
export function isPastInstant(startUtc: Date, now: Date, leadTimeMinutes: number): boolean {
  return startUtc.getTime() < now.getTime() + leadTimeMinutes * 60_000;
}

/**
 * True only if `startUtc`, read in `timezone`, lands exactly on a 45-minute
 * grid line starting at 08:00 and ends by 17:00 — independent of any
 * physio's own availability rules. This is the hard clinic-wide window
 * (physio-booking-app-spec.md rules 1-3), enforced regardless of what a
 * physio's `availability_rules` say.
 */
export function isOnBookableGrid(startUtc: Date, timezone: string): boolean {
  const local = toZonedTime(startUtc, timezone);
  if (local.getSeconds() !== 0 || local.getMilliseconds() !== 0) return false;

  const [openH, openM] = CLINIC_OPEN.split(":").map(Number);
  const [closeH, closeM] = CLINIC_CLOSE.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  const minutes = local.getHours() * 60 + local.getMinutes();

  const alignedToGrid = (minutes - openMin) % SESSION_MINUTES === 0;
  const withinWindow = minutes >= openMin && minutes + SESSION_MINUTES <= closeMin;

  return alignedToGrid && withinWindow;
}
