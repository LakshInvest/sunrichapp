import { describe, expect, it } from "vitest";
import { istDayEnd, istDayOf, istDayStart, istMonth, istShiftDay, istToday } from "@/lib/ist";
import { khataRange } from "@/lib/khata";
import { relativeDay, shortDate } from "@/lib/order-format";

describe("IST day helpers", () => {
  it("1:30 AM IST counts as that IST day, not the previous UTC day", () => {
    // 2026-11-02T20:00:00Z is 01:30 AM IST on 2026-11-03
    const at = new Date("2026-11-02T20:00:00Z");
    expect(istToday(at)).toBe("2026-11-03");
    expect(istMonth(at)).toBe("2026-11");
    expect(istDayOf(at.toISOString())).toBe("2026-11-03");
  });

  it("noon IST stays on the same UTC day", () => {
    const at = new Date("2026-11-02T06:30:00Z"); // 12:00 IST
    expect(istToday(at)).toBe("2026-11-02");
  });

  it("day start and end are the IST midnight window in UTC", () => {
    expect(istDayStart("2026-11-02")).toBe("2026-11-01T18:30:00.000Z");
    expect(istDayEnd("2026-11-02")).toBe("2026-11-02T18:29:59.999Z");
  });

  it("date-only strings are treated as their own day", () => {
    expect(istDayOf("2026-11-02")).toBe("2026-11-02");
    expect(istDayOf("not-a-date")).toBeNull();
  });

  it("shifts a day across month boundaries", () => {
    expect(istShiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(istShiftDay("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("IST-aware ranges and labels", () => {
  it("this month starts on the 1st even late at night IST", () => {
    const at = new Date("2026-11-02T20:30:00Z"); // 2:00 AM IST Nov 3
    expect(khataRange("thisMonth", at).from).toBe("2026-11-01");
    expect(khataRange("thisMonth", at).to).toBe("2026-11-03");
    expect(khataRange("lastMonth", at).to).toBe("2026-10-31");
  });

  it("a 1:30 AM IST stamp is 'today' in IST words", () => {
    const at = new Date("2026-11-02T20:00:00Z"); // 1:30 AM IST Nov 3
    expect(relativeDay(at.toISOString(), at)).toBe("today");
    expect(shortDate(at.toISOString(), "en", at)).toBe("3 Nov");
  });

  it("an order placed 11:30 PM IST shows the next day as tomorrow", () => {
    // placed 2026-11-02T18:00:00Z (23:30 IST Nov 2); slot 2026-11-03T04:00:00Z (9:30 IST Nov 3)
    expect(relativeDay("2026-11-03T04:00:00Z", new Date("2026-11-02T18:00:00Z"))).toBe("tomorrow");
  });
});
