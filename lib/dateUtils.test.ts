import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDaysToIsoDate,
  getDesignatedWeekStartMonday,
  getWeekStartMonday,
} from "./dateUtils";

describe("getWeekStartMonday", () => {
  it("returns Monday for mid-week dates", () => {
    expect(getWeekStartMonday("2026-08-12")).toBe("2026-08-10"); // Wed
    expect(getWeekStartMonday("2026-08-16")).toBe("2026-08-10"); // Sun
  });

  it("returns the same day when already Monday", () => {
    expect(getWeekStartMonday("2026-08-17")).toBe("2026-08-17");
  });
});

describe("getDesignatedWeekStartMonday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("on Sunday uses next Monday so the week starts tomorrow", () => {
    expect(getDesignatedWeekStartMonday("2026-08-16")).toBe("2026-08-17");
  });

  it("on Monday uses that same day", () => {
    expect(getDesignatedWeekStartMonday("2026-08-17")).toBe("2026-08-17");
  });

  it("Tue–Sat uses Monday of the calendar week containing today", () => {
    expect(getDesignatedWeekStartMonday("2026-08-11")).toBe("2026-08-10"); // Tue
    expect(getDesignatedWeekStartMonday("2026-08-15")).toBe("2026-08-10"); // Sat
  });

  it("defaults to today when no date is passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 16, 15, 0, 0)); // Sun Aug 16 local
    expect(getDesignatedWeekStartMonday()).toBe("2026-08-17");
  });
});

describe("addDaysToIsoDate", () => {
  it("shifts calendar days in local time", () => {
    expect(addDaysToIsoDate("2026-08-17", 7)).toBe("2026-08-24");
    expect(addDaysToIsoDate("2026-08-17", -7)).toBe("2026-08-10");
  });
});
