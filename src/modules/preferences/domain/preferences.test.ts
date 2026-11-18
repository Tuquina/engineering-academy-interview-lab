import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, updatePreferences } from "./preferences";

describe("updatePreferences", () => {
  it("aplica cambios parciales", () => {
    const next = updatePreferences(DEFAULT_PREFERENCES, { readingFontSize: "lg" });
    expect(next.readingFontSize).toBe("lg");
    expect(next.newFlashcardsPerDay).toBe(DEFAULT_PREFERENCES.newFlashcardsPerDay);
  });

  it("acota las tarjetas nuevas por día al rango permitido", () => {
    expect(updatePreferences(DEFAULT_PREFERENCES, { newFlashcardsPerDay: 500 }).newFlashcardsPerDay).toBe(50);
    expect(updatePreferences(DEFAULT_PREFERENCES, { newFlashcardsPerDay: -3 }).newFlashcardsPerDay).toBe(0);
    expect(
      updatePreferences(DEFAULT_PREFERENCES, { newFlashcardsPerDay: Number.NaN }).newFlashcardsPerDay,
    ).toBe(0);
  });

  it("devuelve la misma referencia si nada cambia", () => {
    expect(updatePreferences(DEFAULT_PREFERENCES, { readingFontSize: "md" })).toBe(DEFAULT_PREFERENCES);
  });
});
