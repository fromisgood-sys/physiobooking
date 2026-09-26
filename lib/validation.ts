import { z } from "zod";
import { toZonedTime } from "date-fns-tz";
import { CLINIC_OPEN, CLINIC_CLOSE, SESSION_MINUTES } from "./tz";
import { isValidInternationalPhone, normalizeAdminPhone, normalizeInternationalPhone } from "./phone";

export const createAppointmentSchema = z.object({
  physioId: z.string().uuid(),
  startUtc: z.string().datetime(),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(30),
  reasonForVisit: z.string().trim().max(500).optional(),
});

export { normalizeAdminPhone };

const adminPhoneSchema = z
  .string()
  .trim()
  .refine(isValidInternationalPhone, "Enter a valid telephone number")
  .transform((phone) => normalizeInternationalPhone(phone) ?? phone);

export const adminNewPatientDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(100),
  lastName: z.string().trim().min(1, "Enter a last name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(254).transform((email) => email.toLowerCase()),
  phone: adminPhoneSchema,
});

export const adminCreateAppointmentSchema = z.object({
  patient: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("existing"), patientId: z.string().uuid(), phone: adminPhoneSchema }),
    z.object({ kind: z.literal("new") }).extend(adminNewPatientDetailsSchema.shape),
  ]),
  physioId: z.string().uuid(),
  startUtc: z.string().datetime(),
  reasonForVisit: z.string().trim().min(1, "Enter a reason for visit").max(500),
  commentsForPhysiotherapist: z.string().trim().max(500).optional(),
  sendConfirmation: z.boolean().default(true),
});

export type AdminCreateAppointmentInput = z.infer<typeof adminCreateAppointmentSchema>;

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  startUtc: z.string().datetime(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

const namibianPhoneSchema = z
  .string()
  .trim()
  .transform((phone) => {
    const digits = phone.replace(/\D/g, "");
    if (phone.trim().startsWith("+")) return `+${digits}`;
    if (digits.startsWith("264")) return `+${digits}`;
    if (digits.startsWith("0")) return `+264${digits.slice(1)}`;
    return phone.trim();
  })
  .pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, "Enter a valid cellphone number"));

export const rescheduleWithDetailsSchema = z.object({
  startUtc: z.string().datetime(),
  phone: namibianPhoneSchema,
  reasonForVisit: z.string().trim().max(500),
});

export const updateBookingDetailsSchema = z.object({
  phone: z.string().trim().min(6, "Enter a valid phone number").max(30),
  reasonForVisit: z.string().trim().max(500),
});

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

export const clinicSettingsSchema = z.object({
  clinic_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(3).max(40),
  email: z.string().trim().email(),
  website: z.string().trim().url().or(z.literal("")),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100),
  postal_code: z.string().trim().max(30),
  about: z.string().trim().max(500),
  timezone: z.string().trim().min(1).max(100),
  time_format: z.enum(["12h", "24h"]),
  date_format: z.enum(["dd MMM yyyy", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"]),
  logo_url: z.string().url().nullable(),
});

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
