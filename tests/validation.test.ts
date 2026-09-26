import { describe, it, expect } from "vitest";
import {
  createAppointmentSchema,
  rescheduleWithDetailsSchema,
  updateBookingDetailsSchema,
  isPastInstant,
  isOnBookableGrid,
} from "@/lib/validation";
import { CLINIC_TZ } from "@/lib/tz";

describe("createAppointmentSchema", () => {
  const valid = {
    physioId: "11111111-1111-4111-8111-111111111111",
    startUtc: "2026-10-12T06:00:00.000Z",
    phone: "+264811234567",
    reasonForVisit: "Lower back pain",
  };

  it("accepts a well-formed booking payload", () => {
    expect(createAppointmentSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a payload with no reason given (optional)", () => {
    const withoutReason = {
      physioId: valid.physioId,
      startUtc: valid.startUtc,
      phone: valid.phone,
    };
    expect(createAppointmentSchema.safeParse(withoutReason).success).toBe(true);
  });

  it("rejects a non-uuid physioId", () => {
    expect(createAppointmentSchema.safeParse({ ...valid, physioId: "not-a-uuid" }).success).toBe(
      false
    );
  });

  it("rejects a malformed startUtc", () => {
    expect(
      createAppointmentSchema.safeParse({ ...valid, startUtc: "12 October" }).success
    ).toBe(false);
  });

  it("rejects a too-short phone number", () => {
    expect(createAppointmentSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
  });
});

describe("updateBookingDetailsSchema", () => {
  it("accepts a valid phone number and optional booking comments", () => {
    expect(
      updateBookingDetailsSchema.safeParse({
        phone: "+264 81 234 5678",
        reasonForVisit: "Lower back pain",
      }).success
    ).toBe(true);
  });

  it("accepts empty comments", () => {
    expect(updateBookingDetailsSchema.safeParse({ phone: "+264811234567", reasonForVisit: "" }).success).toBe(true);
  });

  it("rejects invalid phone numbers and comments over 500 characters", () => {
    expect(updateBookingDetailsSchema.safeParse({ phone: "123", reasonForVisit: "" }).success).toBe(false);
    expect(
      updateBookingDetailsSchema.safeParse({ phone: "+264811234567", reasonForVisit: "x".repeat(501) }).success
    ).toBe(false);
  });
});

describe("rescheduleWithDetailsSchema", () => {
  const valid = {
    startUtc: "2026-10-20T08:00:00.000Z",
    phone: "+264 81 234 5678",
    reasonForVisit: "Please focus on my shoulder mobility.",
  };

  it("accepts a valid reschedule and normalizes the cellphone number", () => {
    expect(rescheduleWithDetailsSchema.parse(valid)).toEqual({
      ...valid,
      phone: "+264812345678",
    });
  });

  it("rejects invalid phone numbers, timestamps, and comments over 500 characters", () => {
    expect(rescheduleWithDetailsSchema.safeParse({ ...valid, phone: "Call me" }).success).toBe(false);
    expect(rescheduleWithDetailsSchema.safeParse({ ...valid, startUtc: "tomorrow" }).success).toBe(false);
    expect(rescheduleWithDetailsSchema.safeParse({ ...valid, reasonForVisit: "x".repeat(501) }).success).toBe(false);
  });
});

describe("isPastInstant", () => {
  const now = new Date("2026-10-12T08:00:00.000Z");

  it("rejects a start inside the lead-time buffer", () => {
    const start = new Date("2026-10-12T08:59:00.000Z"); // now + 59min
    expect(isPastInstant(start, now, 60)).toBe(true);
  });

  it("accepts a start exactly at the lead-time boundary", () => {
    const start = new Date("2026-10-12T09:00:00.000Z"); // now + 60min
    expect(isPastInstant(start, now, 60)).toBe(false);
  });

  it("accepts a start well in the future", () => {
    const start = new Date("2026-10-20T08:00:00.000Z");
    expect(isPastInstant(start, now, 60)).toBe(false);
  });
});

describe("isOnBookableGrid (clinic window 08:00-17:00, 45-minute grid)", () => {
  // Africa/Windhoek is a fixed UTC+2, no DST — 08:00 local = 06:00 UTC.
  it("accepts the opening slot, 08:00", () => {
    expect(isOnBookableGrid(new Date("2026-10-12T06:00:00.000Z"), CLINIC_TZ)).toBe(true);
  });

  it("accepts the last bookable start, 16:15 (ends exactly at 17:00)", () => {
    expect(isOnBookableGrid(new Date("2026-10-12T14:15:00.000Z"), CLINIC_TZ)).toBe(true);
  });

  it("rejects a start not aligned to the 45-minute grid", () => {
    // 08:20 local — would produce a non-45-minute session if allowed through.
    expect(isOnBookableGrid(new Date("2026-10-12T06:20:00.000Z"), CLINIC_TZ)).toBe(false);
  });

  it("rejects a start that would end after 17:00", () => {
    // 16:30 local + 45min = 17:15.
    expect(isOnBookableGrid(new Date("2026-10-12T14:30:00.000Z"), CLINIC_TZ)).toBe(false);
  });

  it("rejects a start before the clinic opens", () => {
    expect(isOnBookableGrid(new Date("2026-10-12T05:15:00.000Z"), CLINIC_TZ)).toBe(false);
  });

  it("rejects a start with non-zero seconds", () => {
    expect(isOnBookableGrid(new Date("2026-10-12T06:00:30.000Z"), CLINIC_TZ)).toBe(false);
  });
});
