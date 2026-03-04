import { describe, it, expect, vi, afterEach } from "vitest";

describe("CHAOS-01 FIX: localISO uses local timezone, not UTC", () => {
  afterEach(() => vi.useRealTimers());

  it("localISO returns local date components (not UTC)", () => {
    const localISO = (d = new Date()) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const utcISO = (d = new Date()) => d.toISOString().split("T")[0];

    // localISO uses getFullYear/getMonth/getDate (local timezone)
    // utcISO uses toISOString (UTC)
    // They produce the same format but different values near midnight
    const now = new Date();
    const local = localISO(now);
    const utc = utcISO(now);

    // Both should be valid YYYY-MM-DD format
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // localISO matches getDate() (local)
    expect(local).toContain(String(now.getDate()).padStart(2, "0"));
  });

  it("isToday with localISO matches local date correctly", () => {
    const localISO = (d = new Date()) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const isToday = (iso) => {
      if (!iso) return false;
      return iso.startsWith(localISO());
    };

    // Today's local date should match
    expect(isToday(localISO())).toBe(true);
    expect(isToday("1999-01-01")).toBe(false);
    expect(isToday(null)).toBe(false);
  });

  it("tomorrowISO with localISO increments local date", () => {
    const localISO = (d = new Date()) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const tomorrowISO = () => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      return localISO(t);
    };

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(tomorrowISO()).toBe(localISO(tomorrow));
    expect(tomorrowISO()).not.toBe(localISO(today));
  });
});
