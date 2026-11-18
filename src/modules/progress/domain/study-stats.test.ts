import { describe, expect, it } from "vitest";
import { STREAK_THRESHOLD_SECONDS, computeStreak, minutesSeries, totalMinutes } from "./study-stats";

const enough = STREAK_THRESHOLD_SECONDS;

describe("computeStreak", () => {
  it("cuenta días consecutivos que terminan hoy", () => {
    const days = { "2026-11-16": enough, "2026-11-17": enough, "2026-11-18": enough };
    expect(computeStreak(days, "2026-11-18")).toBe(3);
  });

  it("no rompe la racha si hoy todavía no hubo actividad", () => {
    const days = { "2026-11-16": enough, "2026-11-17": enough };
    expect(computeStreak(days, "2026-11-18")).toBe(2);
  });

  it("se corta ante un día sin actividad suficiente y cruza cambios de mes", () => {
    const days = {
      "2026-10-31": enough,
      "2026-11-01": enough,
      "2026-11-02": enough - 1,
      "2026-11-03": enough,
    };
    expect(computeStreak(days, "2026-11-03")).toBe(1);
    expect(computeStreak(days, "2026-11-01")).toBe(2);
    expect(computeStreak({}, "2026-11-18")).toBe(0);
  });
});

describe("series de minutos", () => {
  it("rellena con ceros los días sin actividad, en orden cronológico", () => {
    expect(minutesSeries({ "2026-11-18": 125 }, "2026-11-18", 3)).toEqual([
      { day: "2026-11-16", minutes: 0 },
      { day: "2026-11-17", minutes: 0 },
      { day: "2026-11-18", minutes: 2 },
    ]);
  });

  it("suma sólo la ventana pedida", () => {
    expect(totalMinutes({ "2026-11-10": 600, "2026-11-18": 120 }, "2026-11-18", 7)).toBe(2);
  });
});
