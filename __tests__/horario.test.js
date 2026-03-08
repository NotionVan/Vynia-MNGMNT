import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/api.js", () => ({
  notion: {
    loadHorario: vi.fn(),
    saveHorarioDia: vi.fn(),
  },
  invalidateApiCache: vi.fn(),
}));

import { notion } from "../src/api.js";
import {
  HORARIO_KEY,
  loadHorarioLocal,
  saveHorarioLocal,
  loadHorario,
  saveHorarioDia,
  jsDayToBdIndex,
  isOpenDay,
  getOpenDaysInRange,
} from "../src/utils/horario.js";

// ─── Sample horario data ───
const SAMPLE_HORARIO = {
  0: { abierto: true, apertura: "09:00", cierre: "14:00", apertura2: null, cierre2: null },
  1: { abierto: true, apertura: "09:00", cierre: "14:00", apertura2: null, cierre2: null },
  2: { abierto: true, apertura: "09:00", cierre: "14:00", apertura2: null, cierre2: null },
  3: { abierto: true, apertura: "09:00", cierre: "14:00", apertura2: null, cierre2: null },
  4: { abierto: true, apertura: "09:00", cierre: "14:00", apertura2: null, cierre2: null },
  5: { abierto: false, apertura: "", cierre: "", apertura2: null, cierre2: null },  // Sabado
  6: { abierto: false, apertura: "", cierre: "", apertura2: null, cierre2: null },  // Domingo
};

describe("jsDayToBdIndex", () => {
  it("maps Sunday (0) to BD index 6 (Domingo)", () => {
    expect(jsDayToBdIndex(0)).toBe(6);
  });
  it("maps Monday (1) to BD index 0 (Lunes)", () => {
    expect(jsDayToBdIndex(1)).toBe(0);
  });
  it("maps Tuesday (2) to BD index 1 (Martes)", () => {
    expect(jsDayToBdIndex(2)).toBe(1);
  });
  it("maps Wednesday (3) to BD index 2 (Miercoles)", () => {
    expect(jsDayToBdIndex(3)).toBe(2);
  });
  it("maps Thursday (4) to BD index 3 (Jueves)", () => {
    expect(jsDayToBdIndex(4)).toBe(3);
  });
  it("maps Friday (5) to BD index 4 (Viernes)", () => {
    expect(jsDayToBdIndex(5)).toBe(4);
  });
  it("maps Saturday (6) to BD index 5 (Sabado)", () => {
    expect(jsDayToBdIndex(6)).toBe(5);
  });
});

describe("isOpenDay", () => {
  it("returns true for an open day", () => {
    // 2026-03-09 is Monday → bdIndex 0 → abierto: true
    expect(isOpenDay(SAMPLE_HORARIO, "2026-03-09")).toBe(true);
  });

  it("returns false for a closed day", () => {
    // 2026-03-08 is Sunday → bdIndex 6 → abierto: false
    expect(isOpenDay(SAMPLE_HORARIO, "2026-03-08")).toBe(false);
  });

  it("returns true when horario is null (fallback)", () => {
    expect(isOpenDay(null, "2026-03-08")).toBe(true);
  });

  it("returns true when horario is undefined (fallback)", () => {
    expect(isOpenDay(undefined, "2026-03-08")).toBe(true);
  });

  it("returns true when horario is empty object (fallback)", () => {
    expect(isOpenDay({}, "2026-03-08")).toBe(true);
  });

  it("returns true for a day with horario partido (split schedule)", () => {
    const horarioPartido = {
      ...SAMPLE_HORARIO,
      0: { abierto: true, apertura: "09:00", cierre: "14:00", apertura2: "17:00", cierre2: "19:00" },
    };
    // Monday with split schedule → still open
    expect(isOpenDay(horarioPartido, "2026-03-09")).toBe(true);
  });

  it("returns true for invalid date string (fail-open)", () => {
    expect(isOpenDay(SAMPLE_HORARIO, "not-a-date")).toBe(true);
  });

  it("returns true when day entry is missing from horario", () => {
    const partial = { 0: { abierto: true, apertura: "09:00", cierre: "14:00" } };
    // Tuesday → bdIndex 1 → not in partial → default open
    expect(isOpenDay(partial, "2026-03-10")).toBe(true);
  });

  // Verify specific day mapping with known dates
  it("correctly maps Saturday 2026-03-07 to BD index 5 (Sabado closed)", () => {
    expect(isOpenDay(SAMPLE_HORARIO, "2026-03-07")).toBe(false);
  });

  it("correctly maps Friday 2026-03-06 to BD index 4 (Viernes open)", () => {
    expect(isOpenDay(SAMPLE_HORARIO, "2026-03-06")).toBe(true);
  });
});

describe("getOpenDaysInRange", () => {
  it("returns only open days in a range", () => {
    // Starting Monday 2026-03-09, 7 days: Mon-Fri open, Sat-Sun closed
    const result = getOpenDaysInRange(SAMPLE_HORARIO, "2026-03-09", 7);
    expect(result).toHaveLength(5);
    expect(result).toEqual([
      "2026-03-09", // Mon
      "2026-03-10", // Tue
      "2026-03-11", // Wed
      "2026-03-12", // Thu
      "2026-03-13", // Fri
    ]);
  });

  it("returns empty array when all days are closed", () => {
    const allClosed = {};
    for (let i = 0; i < 7; i++) allClosed[i] = { abierto: false };
    const result = getOpenDaysInRange(allClosed, "2026-03-09", 7);
    expect(result).toEqual([]);
  });

  it("returns all days when horario is null (fallback)", () => {
    const result = getOpenDaysInRange(null, "2026-03-09", 3);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for 0 days", () => {
    expect(getOpenDaysInRange(SAMPLE_HORARIO, "2026-03-09", 0)).toEqual([]);
  });

  it("returns empty array for negative days", () => {
    expect(getOpenDaysInRange(SAMPLE_HORARIO, "2026-03-09", -1)).toEqual([]);
  });

  it("returns empty array for invalid date", () => {
    expect(getOpenDaysInRange(SAMPLE_HORARIO, "not-a-date", 7)).toEqual([]);
  });
});

describe("loadHorarioLocal", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it("returns parsed data when stored", () => {
    localStorage.setItem(HORARIO_KEY, JSON.stringify({ horario: SAMPLE_HORARIO }));
    const result = loadHorarioLocal();
    expect(result).toEqual({ horario: SAMPLE_HORARIO });
  });

  it("returns null when localStorage is empty", () => {
    expect(loadHorarioLocal()).toBeNull();
  });

  it("returns null on invalid JSON", () => {
    localStorage.setItem(HORARIO_KEY, "{bad json");
    expect(loadHorarioLocal()).toBeNull();
  });
});

describe("saveHorarioLocal", () => {
  beforeEach(() => { localStorage.clear(); });

  it("saves data to localStorage", () => {
    saveHorarioLocal({ horario: SAMPLE_HORARIO });
    const stored = JSON.parse(localStorage.getItem(HORARIO_KEY));
    expect(stored.horario).toEqual(SAMPLE_HORARIO);
  });

  it("removes key when data is null", () => {
    localStorage.setItem(HORARIO_KEY, "test");
    saveHorarioLocal(null);
    expect(localStorage.getItem(HORARIO_KEY)).toBeNull();
  });
});

describe("loadHorario (async hybrid)", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it("loads from Notion API and syncs to localStorage", async () => {
    const apiResponse = { horario: SAMPLE_HORARIO, lastEdited: "2026-03-08T10:00:00Z" };
    notion.loadHorario.mockResolvedValue(apiResponse);
    const result = await loadHorario();
    expect(result).toEqual(apiResponse);
    expect(JSON.parse(localStorage.getItem(HORARIO_KEY))).toEqual(apiResponse);
  });

  it("falls back to localStorage when API fails", async () => {
    const cached = { horario: SAMPLE_HORARIO, lastEdited: "2026-03-07T10:00:00Z" };
    localStorage.setItem(HORARIO_KEY, JSON.stringify(cached));
    notion.loadHorario.mockRejectedValue(new Error("Network error"));
    const result = await loadHorario();
    expect(result).toEqual(cached);
  });

  it("returns null when both API and localStorage fail", async () => {
    notion.loadHorario.mockRejectedValue(new Error("Network error"));
    const result = await loadHorario();
    expect(result).toBeNull();
  });
});

describe("saveHorarioDia (write-through)", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it("writes to localStorage and fires API call", () => {
    notion.saveHorarioDia.mockResolvedValue({ ok: true });
    const result = saveHorarioDia(SAMPLE_HORARIO, 0, { apertura: "08:00" });
    expect(result[0].apertura).toBe("08:00");
    const stored = JSON.parse(localStorage.getItem(HORARIO_KEY));
    expect(stored.horario[0].apertura).toBe("08:00");
    expect(notion.saveHorarioDia).toHaveBeenCalledWith(0, { apertura: "08:00" });
  });

  it("handles API failure gracefully (localStorage still updated)", () => {
    notion.saveHorarioDia.mockRejectedValue(new Error("Timeout"));
    const result = saveHorarioDia(SAMPLE_HORARIO, 5, { abierto: true });
    expect(result[5].abierto).toBe(true);
    const stored = JSON.parse(localStorage.getItem(HORARIO_KEY));
    expect(stored.horario[5].abierto).toBe(true);
  });
});
