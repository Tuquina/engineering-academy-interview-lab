import { describe, expect, it } from "vitest";
import { mergeThreeWay, type Json } from "./three-way-merge";

describe("merge de tres vías", () => {
  it("si sólo cambió un lado, gana ese lado (incluidos los borrados)", () => {
    const base = { notes: { a: "x", b: "y" } };
    const local = { notes: { a: "x" } }; // se borró b en este navegador
    const remote = { notes: { a: "x2", b: "y" } }; // otro dispositivo editó a
    expect(mergeThreeWay(base, local, remote)).toEqual({ notes: { a: "x2" } });
  });

  it("un borrado contra una modificación conserva el dato modificado", () => {
    expect(mergeThreeWay({ a: { t: 1 } }, {}, { a: { t: 2 } })).toEqual({ a: { t: 2 } });
  });

  it("combina conjuntos de textos respetando agregados y quitados", () => {
    expect(mergeThreeWay(["x", "y"], ["x", "z"], ["x", "y", "w"])).toEqual(["x", "w", "z"]);
  });

  it("combina listas con id sin duplicar registros", () => {
    const base: Json = [{ id: "s1", score: 1 }];
    const local: Json = [
      { id: "s1", score: 1 },
      { id: "s2", score: 5 },
    ];
    const remote: Json = [
      { id: "s1", score: 1 },
      { id: "s3", score: 7 },
    ];
    expect(mergeThreeWay(base, local, remote)).toEqual([
      { id: "s1", score: 1 },
      { id: "s3", score: 7 },
      { id: "s2", score: 5 },
    ]);
  });

  it("primer inicio de sesión (sin ancestro): una lección completada sigue completada", () => {
    const local = {
      lessons: {
        l1: {
          status: "in_progress",
          startedAt: "2026-03-02T00:00:00Z",
          lastVisitedAt: "2026-03-05T00:00:00Z",
        },
      },
    };
    const remote = {
      lessons: {
        l1: { status: "completed", startedAt: "2026-03-01T00:00:00Z", lastVisitedAt: "2026-03-03T00:00:00Z" },
      },
    };
    expect(mergeThreeWay({ lessons: {} }, local, remote)).toEqual({
      lessons: {
        l1: { status: "completed", startedAt: "2026-03-01T00:00:00Z", lastVisitedAt: "2026-03-05T00:00:00Z" },
      },
    });
  });

  it("los contadores en conflicto toman el máximo y el merge es idempotente", () => {
    const base = { attempts: 1 };
    const once = mergeThreeWay(base, { attempts: 3 }, { attempts: 2 });
    expect(once).toEqual({ attempts: 3 });
    // Reintentar con el resultado ya subido no cambia nada (no se duplican intentos).
    expect(mergeThreeWay(once, once, once)).toEqual(once);
    expect(mergeThreeWay(base, once, once)).toEqual(once);
  });
});
