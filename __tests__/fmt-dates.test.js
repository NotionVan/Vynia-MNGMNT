import { describe, it, expect } from "vitest";
import { fmt, DAY_NAMES } from "../src/utils/fmt.js";

// ─── fmt.localISO ───

describe("fmt.localISO", () => {
  it("formats a Date as YYYY-MM-DD using local timezone", () => {
    const d = new Date(2026, 2, 8, 14, 30); // March 8, 2026 14:30 local
    expect(fmt.localISO(d)).toBe("2026-03-08");
  });

  it("pads single-digit month and day", () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(fmt.localISO(d)).toBe("2026-01-05");
  });

  it("returns today when called without arguments", () => {
    const result = fmt.localISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Should match what todayISO returns
    expect(result).toBe(fmt.todayISO());
  });
});

// ─── fmt.isToday ───

describe("fmt.isToday", () => {
  it("returns true for today's ISO date", () => {
    const today = fmt.todayISO();
    expect(fmt.isToday(today)).toBe(true);
  });

  it("returns true for today's ISO datetime", () => {
    const todayWithTime = fmt.todayISO() + "T10:30:00";
    expect(fmt.isToday(todayWithTime)).toBe(true);
  });

  it("returns false for a different date", () => {
    expect(fmt.isToday("2020-01-01")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(fmt.isToday(null)).toBe(false);
    expect(fmt.isToday(undefined)).toBe(false);
  });
});

// ─── fmt.isTomorrow ───

describe("fmt.isTomorrow", () => {
  it("returns true for tomorrow's ISO date", () => {
    const tomorrow = fmt.tomorrowISO();
    expect(fmt.isTomorrow(tomorrow)).toBe(true);
  });

  it("returns false for today", () => {
    expect(fmt.isTomorrow(fmt.todayISO())).toBe(false);
  });

  it("returns false for null", () => {
    expect(fmt.isTomorrow(null)).toBe(false);
  });
});

// ─── fmt.isPast ───

describe("fmt.isPast", () => {
  it("returns true for a past date", () => {
    expect(fmt.isPast("2020-01-01")).toBe(true);
  });

  it("returns false for a future date", () => {
    expect(fmt.isPast("2099-12-31")).toBe(false);
  });

  it("returns false for null", () => {
    expect(fmt.isPast(null)).toBe(false);
  });
});

// ─── fmt.date (display format) ───

describe("fmt.date", () => {
  it("formats ISO date to 'Día N mes' in Spanish", () => {
    // Use a known date: Wednesday March 4, 2026
    const result = fmt.date("2026-03-04");
    expect(result).toContain("4");
    expect(result).toContain("mar");
  });

  it("returns dash for null/undefined", () => {
    expect(fmt.date(null)).toBe("—");
    expect(fmt.date(undefined)).toBe("—");
  });
});

// ─── fmt.time ───

describe("fmt.time", () => {
  it("extracts HH:MM from ISO datetime", () => {
    const result = fmt.time("2026-03-08T09:05:00");
    expect(result).toBe("09:05");
  });

  it("returns empty string for date-only ISO", () => {
    expect(fmt.time("2026-03-08")).toBe("");
  });

  it("returns empty string for null", () => {
    expect(fmt.time(null)).toBe("");
  });
});

// ─── DAY_NAMES ───

describe("DAY_NAMES", () => {
  it("has 7 entries starting with Dom", () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe("Dom");
    expect(DAY_NAMES[6]).toBe("Sab");
  });
});
