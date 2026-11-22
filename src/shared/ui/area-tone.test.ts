import { describe, expect, it } from "vitest";
import { areaTone, areaToneClass } from "./area-tone";

describe("areaTone", () => {
  it("asigna a cada área conocida un tono distinto", () => {
    const ids = [
      "languages-runtime",
      "frontend",
      "architecture",
      "system-design",
      "ai-agents",
      "data",
      "backend-languages",
    ];
    expect(new Set(ids.map(areaTone)).size).toBe(ids.length);
  });

  it("da un tono estable y válido a un área desconocida", () => {
    const tone = areaTone("nueva-area");
    expect(tone).toBe(areaTone("nueva-area"));
    expect(tone).toBeGreaterThanOrEqual(1);
    expect(tone).toBeLessThanOrEqual(7);
  });

  it("expone el tono como clase CSS", () => {
    expect(areaToneClass("frontend")).toBe("area-tone-2");
    expect(areaToneClass(undefined)).toBe("area-tone-1");
  });
});
