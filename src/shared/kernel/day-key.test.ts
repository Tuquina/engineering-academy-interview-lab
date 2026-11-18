import { describe, expect, it } from "vitest";
import { addDays, lastDays, toDayKey } from "./day-key";

describe("day keys", () => {
  it("formatea el día local", () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("suma y resta días cruzando meses y años bisiestos", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("genera ventanas de días en orden cronológico", () => {
    expect(lastDays("2026-11-02", 3)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});
