import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS } from "../domain/progress";
import { parseStoredProgress } from "./local-storage-progress-store";

const at = "2026-11-18T12:00:00.000Z";

describe("parseStoredProgress", () => {
  it("acepta el formato vigente (v2)", () => {
    const v2 = {
      ...EMPTY_PROGRESS,
      lessons: {
        a: { status: "completed", startedAt: at, lastVisitedAt: at, completedAt: at, lastSectionId: "x" },
      },
      studySeconds: { "2026-11-18": 300 },
    };
    expect(parseStoredProgress(v2)).toEqual(v2);
  });

  it("migra v1 a v2 conservando el progreso de lecciones", () => {
    const v1 = {
      schemaVersion: 1,
      lessons: { a: { status: "in_progress", startedAt: at, lastVisitedAt: at, completedAt: null } },
    };
    expect(parseStoredProgress(v1)).toEqual({
      schemaVersion: 2,
      lessons: {
        a: {
          status: "in_progress",
          startedAt: at,
          lastVisitedAt: at,
          completedAt: null,
          lastSectionId: null,
        },
      },
      questions: {},
      studySeconds: {},
    });
  });

  it("rechaza formatos desconocidos o manipulados", () => {
    expect(parseStoredProgress(null)).toBeNull();
    expect(parseStoredProgress({ schemaVersion: 99, lessons: {} })).toBeNull();
    expect(parseStoredProgress({ schemaVersion: 1, lessons: { a: { status: "hacked" } } })).toBeNull();
    expect(parseStoredProgress({ ...EMPTY_PROGRESS, studySeconds: { "no-es-fecha": 10 } })).toBeNull();
  });
});
