import { describe, expect, it } from "vitest";
import {
  adminCreateAppointmentSchema,
  adminNewPatientDetailsSchema,
  normalizeAdminPhone,
} from "@/lib/validation";
import { excludePatientConflicts, generateSlots, type Slot } from "@/lib/slots";

const slot: Slot = {
  startUtc: "2026-10-12T06:00:00.000Z",
  endUtc: "2026-10-12T06:45:00.000Z",
  label: "08:00",
};

describe("admin appointment patient validation", () => {
  it("normalizes Namibia local numbers to E.164 without storing a national trunk prefix", () => {
    expect(normalizeAdminPhone("+264", "081 234 5678")).toBe("+264812345678");
  });

  it("normalizes a selected international country code", () => {
    expect(normalizeAdminPhone("+27", "082 123 4567")).toBe("+27821234567");
  });

  it("validates and normalizes a new patient's email", () => {
    expect(adminNewPatientDetailsSchema.parse({
      firstName: "  Ada ",
      lastName: "  Patient ",
      email: " ADA@example.com ",
      phone: "+264812345678",
    })).toEqual({
      firstName: "Ada",
      lastName: "Patient",
      email: "ada@example.com",
      phone: "+264812345678",
    });
  });

  it("normalizes formatted international phone input to E.164", () => {
    expect(adminNewPatientDetailsSchema.parse({
      firstName: "Ada",
      lastName: "Patient",
      email: "ada@example.com",
      phone: "+264 81 234 5678",
    }).phone).toBe("+264812345678");
  });

  it("rejects missing names, invalid email and non-E.164 phone numbers", () => {
    expect(adminNewPatientDetailsSchema.safeParse({ firstName: "", lastName: "P", email: "a", phone: "081" }).success).toBe(false);
  });

  it("accepts existing-patient appointment details and defaults confirmation on", () => {
    const result = adminCreateAppointmentSchema.parse({
      patient: { kind: "existing", patientId: "11111111-1111-4111-8111-111111111111", phone: "+264812345678" },
      physioId: "22222222-2222-4222-8222-222222222222",
      startUtc: slot.startUtc,
      reasonForVisit: "Shoulder mobility",
    });
    expect(result.sendConfirmation).toBe(true);
  });

  it("rejects comments longer than the persisted field limit", () => {
    expect(adminCreateAppointmentSchema.safeParse({
      patient: { kind: "existing", patientId: "11111111-1111-4111-8111-111111111111", phone: "+264812345678" },
      physioId: "22222222-2222-4222-8222-222222222222",
      startUtc: slot.startUtc,
      commentsForPhysiotherapist: "x".repeat(1001),
    }).success).toBe(false);
  });
});

describe("excludePatientConflicts", () => {
  it("removes slots overlapping the selected patient's active appointment", () => {
    expect(excludePatientConflicts([slot], [{ starts_at: "2026-10-12T06:30:00.000Z", ends_at: "2026-10-12T07:15:00.000Z" }])).toEqual([]);
  });

  it("keeps slots that only touch an appointment boundary", () => {
    expect(excludePatientConflicts([slot], [{ starts_at: "2026-10-12T06:45:00.000Z", ends_at: "2026-10-12T07:30:00.000Z" }])).toEqual([slot]);
  });
});

describe("generateSlots admin booking grid", () => {
  it("aligns availability-rule starts to the clinic-wide 45-minute grid", () => {
    const slots = generateSlots({
      date: "2026-10-12",
      availabilityRules: [{ weekday: 1, start_time: "08:30", end_time: "11:00" }],
      now: new Date("2026-09-26T00:00:00.000Z"),
    });
    expect(slots.map((item) => item.label)).toEqual(["08:45", "09:30", "10:15"]);
  });
});