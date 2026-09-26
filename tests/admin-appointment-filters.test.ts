import { describe, expect, it } from "vitest";
import { adminTimeWindowUtc } from "@/lib/admin-appointment-filters";

describe("adminTimeWindowUtc", () => {
  it("maps morning hours to clinic-local 08:00 through 12:00", () => {
    expect(adminTimeWindowUtc("2026-10-12", "morning", "Africa/Windhoek")).toEqual({
      start: "2026-10-12T06:00:00.000Z",
      end: "2026-10-12T10:00:00.000Z",
    });
  });

  it("keeps noon end-exclusive at 13:30 and starts afternoon there", () => {
    expect(adminTimeWindowUtc("2026-10-12", "noon", "Africa/Windhoek")).toEqual({
      start: "2026-10-12T10:00:00.000Z",
      end: "2026-10-12T11:30:00.000Z",
    });
    expect(adminTimeWindowUtc("2026-10-12", "afternoon", "Africa/Windhoek")).toEqual({
      start: "2026-10-12T11:30:00.000Z",
      end: "2026-10-12T15:00:00.000Z",
    });
  });
});