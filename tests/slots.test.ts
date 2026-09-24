import { describe, it, expect } from "vitest";
import { generateSlots, type AvailabilityRule } from "@/lib/slots";

// 2026-10-12 in Africa/Windhoek (fixed UTC+2, no DST since 2017).
const DATE = "2026-10-12";
const WEEKDAY = new Date(Date.UTC(2026, 9, 12)).getUTCDay();
const MON_FRI_8_TO_17: AvailabilityRule[] = [
  { weekday: WEEKDAY, start_time: "08:00", end_time: "17:00" },
];

// Comfortably in the future relative to `new Date()` so "past date" tests
// (which use no explicit `now`) can't accidentally pass for the wrong reason.
const FUTURE_NOW = new Date("2020-01-01T00:00:00Z");

describe("generateSlots — normal day", () => {
  it("returns every 45-minute slot from 08:00 to the 16:15 last start", () => {
    const slots = generateSlots({
      date: DATE,
      availabilityRules: MON_FRI_8_TO_17,
      now: FUTURE_NOW,
    });

    expect(slots).toHaveLength(12);
    expect(slots[0].label).toBe("08:00");
    expect(slots.at(-1)!.label).toBe("16:15");
  });

  it("stores each slot as UTC instants exactly 45 minutes apart", () => {
    const slots = generateSlots({
      date: DATE,
      availabilityRules: MON_FRI_8_TO_17,
      now: FUTURE_NOW,
    });

    // 08:00 local (UTC+2) is 06:00 UTC.
    expect(slots[0].startUtc).toBe("2026-10-12T06:00:00.000Z");
    for (const slot of slots) {
      const durationMs = new Date(slot.endUtc).getTime() - new Date(slot.startUtc).getTime();
      expect(durationMs).toBe(45 * 60_000);
    }
  });
});

describe("generateSlots — last-slot boundary", () => {
  it("never offers a start after 16:15 (would end after 17:00)", () => {
    const slots = generateSlots({
      date: DATE,
      availabilityRules: MON_FRI_8_TO_17,
      now: FUTURE_NOW,
    });

    expect(slots.some((s) => s.label > "16:15")).toBe(false);
    // 16:15 + 45min = 17:00 local, the clinic close.
    expect(slots.at(-1)!.endUtc).toBe("2026-10-12T15:00:00.000Z");
  });

  it("clamps a rule that overruns the clinic window to 17:00 regardless", () => {
    const slots = generateSlots({
      date: DATE,
      availabilityRules: [{ weekday: WEEKDAY, start_time: "08:00", end_time: "18:00" }],
      now: FUTURE_NOW,
    });

    expect(slots.at(-1)!.label).toBe("16:15");
  });
});

describe("generateSlots — partially booked day", () => {
  it("drops only the slot overlapping an existing appointment", () => {
    const slots = generateSlots({
      date: DATE,
      availabilityRules: MON_FRI_8_TO_17,
      // 10:15-11:00 local = 08:15-09:00 UTC, exactly the "10:15" slot.
      appointments: [
        { starts_at: "2026-10-12T08:15:00.000Z", ends_at: "2026-10-12T09:00:00.000Z" },
      ],
      now: FUTURE_NOW,
    });

    expect(slots).toHaveLength(11);
    expect(slots.some((s) => s.label === "10:15")).toBe(false);
  });
});

describe("generateSlots — fully booked day", () => {
  it("returns no slots when time-off covers the whole window", () => {
    const slots = generateSlots({
      date: DATE,
      availabilityRules: MON_FRI_8_TO_17,
      timeOff: [
        { starts_at: "2026-10-12T06:00:00.000Z", ends_at: "2026-10-12T15:00:00.000Z" },
      ],
      now: FUTURE_NOW,
    });

    expect(slots).toHaveLength(0);
  });
});

describe("generateSlots — time-off overlap", () => {
  it("drops every slot overlapping a lunch block", () => {
    const slots = generateSlots({
      date: DATE,
      availabilityRules: MON_FRI_8_TO_17,
      // 12:00-13:00 local = 10:00-11:00 UTC
      timeOff: [
        { starts_at: "2026-10-12T10:00:00.000Z", ends_at: "2026-10-12T11:00:00.000Z" },
      ],
      now: FUTURE_NOW,
    });

    expect(slots).toHaveLength(10);
    expect(slots.some((s) => s.label === "12:00" || s.label === "12:45")).toBe(false);
  });
});

describe("generateSlots — today with passed times", () => {
  it("drops slots earlier than now plus the lead time", () => {
    // 10:00 local = 08:00 UTC on the same clinic day.
    const now = new Date("2026-10-12T08:00:00.000Z");
    const slots = generateSlots({
      date: DATE,
      availabilityRules: MON_FRI_8_TO_17,
      now,
      leadTimeMinutes: 60,
    });

    // now + 60min = 11:00 local, which sits exactly on the slot grid.
    expect(slots[0].label).toBe("11:00");
    expect(slots).toHaveLength(8);
  });
});

describe("generateSlots — past dates", () => {
  it("rejects a date before today outright", () => {
    const now = new Date("2026-10-13T12:00:00.000Z");
    const slots = generateSlots({
      date: DATE, // 2026-10-12, before `now`'s clinic-local date
      availabilityRules: MON_FRI_8_TO_17,
      now,
    });

    expect(slots).toHaveLength(0);
  });
});

describe("generateSlots — DST-shifting zone (proves UTC storage is sound)", () => {
  it("applies the correct UTC offset either side of a US DST transition", () => {
    // US clocks spring forward on 2024-03-10.
    const saturdayBefore = generateSlots({
      date: "2024-03-09",
      availabilityRules: [{ weekday: 6, start_time: "08:00", end_time: "17:00" }],
      timezone: "America/New_York",
      now: FUTURE_NOW,
    });
    const sundayAfter = generateSlots({
      date: "2024-03-10",
      availabilityRules: [{ weekday: 0, start_time: "08:00", end_time: "17:00" }],
      timezone: "America/New_York",
      now: FUTURE_NOW,
    });

    // EST (UTC-5) the day before the transition.
    expect(saturdayBefore[0].startUtc).toBe("2024-03-09T13:00:00.000Z");
    // EDT (UTC-4) the day of the transition.
    expect(sundayAfter[0].startUtc).toBe("2024-03-10T12:00:00.000Z");

    for (const slot of [...saturdayBefore, ...sundayAfter]) {
      const durationMs = new Date(slot.endUtc).getTime() - new Date(slot.startUtc).getTime();
      expect(durationMs).toBe(45 * 60_000);
    }
  });
});
