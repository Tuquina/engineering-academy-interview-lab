import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gradeSqlExercise } from "@/modules/sql-lab/application/sql-engine";
import { lastResultSet } from "@/modules/sql-lab/domain/sql-exercise";
import { loadSqlLab, type SqlLabContent } from "@/modules/sql-lab/infrastructure/file-system-sql-lab-source";
import { PgliteSqlEngine } from "@/modules/sql-lab/infrastructure/pglite-sql-engine";

/**
 * Verifica el SQL Lab con PostgreSQL real (PGlite): el dataset carga, cada solución de referencia se corrige como
 * correcta, devuelve datos y una respuesta incorrecta típica se detecta.
 */
const contentRoot = path.resolve(import.meta.dirname, "../../content");
let lab: SqlLabContent;
let engine: PgliteSqlEngine;

beforeAll(async () => {
  lab = await loadSqlLab(contentRoot);
  engine = new PgliteSqlEngine(lab.dataset);
}, 60_000);

afterAll(async () => {
  await engine.reset();
});

describe("SQL Lab", () => {
  it("carga el dataset con todas las tablas y datos", async () => {
    const schema = await engine.describeSchema();
    const counts = Object.fromEntries(schema.map((t) => [t.name, t.rowCount]));
    expect(Object.keys(counts).sort()).toEqual(
      [
        "agents",
        "campaign_targets",
        "campaigns",
        "conversations",
        "customers",
        "installments",
        "loans",
        "payment_promises",
        "payments",
      ].sort(),
    );
    expect(counts.customers).toBe(12);
    expect(counts.installments).toBeGreaterThan(100);
  }, 60_000);

  it("cada solución de referencia se corrige como correcta y devuelve datos", async () => {
    expect(lab.exercises.length).toBeGreaterThanOrEqual(6);
    for (const exercise of lab.exercises) {
      const graded = await gradeSqlExercise(engine, exercise, exercise.solution);
      expect(graded.kind, exercise.id).toBe("graded");
      if (graded.kind === "graded") {
        expect(graded.outcome.correct, `${exercise.id}: ${graded.outcome.message}`).toBe(true);
        expect(lastResultSet(graded.userResults)?.rows.length, exercise.id).toBeGreaterThan(0);
      }
    }
  }, 60_000);

  it("los resultados esperados son los que describe el enunciado", async () => {
    const run = async (id: string) => {
      const exercise = lab.exercises.find((e) => e.id === id)!;
      const outcome = await engine.execute(exercise.solution, { rollback: true });
      if (!outcome.ok) throw new Error(outcome.error.message);
      return lastResultSet(outcome.results)!;
    };
    const overdue = await run("sql.overdue-by-customer");
    expect(overdue.rows[0]).toEqual(["Elena Suárez", "1200000"]);
    expect(overdue.rows.map((r) => r[0])).toContain("Julián Ortiz");
    expect(overdue.rows.map((r) => r[0])).not.toContain("Diego Fernández");

    const broken = await run("sql.broken-promises");
    expect(broken.rows.map((r) => r[0]).sort()).toEqual([1, 2, 5, 6, 8]);

    const campaigns = await run("sql.campaign-contact-rate");
    expect(campaigns.rows.map((r) => [r[0], String(r[4])])).toEqual(
      expect.arrayContaining([
        ["Mora temprana octubre", "71.4"],
        ["Recupero pyme", "75.0"],
        ["Recordatorio preventivo", "25.0"],
      ]),
    );
  }, 60_000);

  it("detecta respuestas incorrectas típicas", async () => {
    const byId = (id: string) => lab.exercises.find((e) => e.id === id)!;

    // Sin COALESCE se pierden las promesas sin ningún pago.
    const withoutCoalesce = await gradeSqlExercise(
      engine,
      byId("sql.broken-promises"),
      byId("sql.broken-promises").solution.replace("COALESCE((", "((").replace("), 0) <", ") <"),
    );
    expect(withoutCoalesce.kind === "graded" && withoutCoalesce.outcome.correct).toBe(false);

    // Un INSERT sin ON CONFLICT falla en la segunda ejecución.
    const plainInsert = await gradeSqlExercise(
      engine,
      byId("sql.idempotent-payment-insert"),
      byId("sql.idempotent-payment-insert").solution.replace(
        "ON CONFLICT (provider, external_id) DO NOTHING",
        "",
      ),
    );
    expect(plainInsert.kind).toBe("user-error");
  }, 60_000);

  it("corregir no modifica el dataset (todo se revierte)", async () => {
    const before = await engine.execute("SELECT COUNT(*) FROM payments", { rollback: false });
    await gradeSqlExercise(
      engine,
      lab.exercises.find((e) => e.id === "sql.idempotent-payment-insert")!,
      "INSERT INTO payments (loan_id, provider, external_id, amount_cents, paid_at) VALUES (1, 'x', 'y', 1, now()) ON CONFLICT DO NOTHING",
    );
    const after = await engine.execute("SELECT COUNT(*) FROM payments", { rollback: false });
    expect(after).toMatchObject({ ok: true });
    expect(before.ok && after.ok && lastResultSet(after.results)?.rows).toEqual(
      before.ok && lastResultSet(before.results)?.rows,
    );
  }, 60_000);
});
