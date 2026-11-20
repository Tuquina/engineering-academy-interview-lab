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
        "customers",
        "order_items",
        "orders",
        "payments",
        "products",
        "reviews",
        "room_bookings",
        "rooms",
        "sellers",
        "shipment_events",
        "shipments",
        "support_tickets",
        "ticket_messages",
      ].sort(),
    );
    expect(counts.customers).toBe(12);
    expect(counts.orders).toBe(18);
    expect(counts.payments).toBe(15);
    expect(counts.shipment_events).toBeGreaterThan(40);
  }, 60_000);

  it("cada solución de referencia se corrige como correcta y devuelve datos", async () => {
    expect(lab.exercises.length).toBeGreaterThanOrEqual(8);
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
    const revenue = await run("sql.revenue-by-seller");
    expect(revenue.rows[0]).toEqual(["TecnoSur", "34000000"]);
    expect(revenue.rows.map((r) => r[0])).toEqual([
      "TecnoSur",
      "DeportesYa",
      "Casa Nativa",
      "Librería del Puerto",
      "Verde Hogar",
    ]);

    const late = await run("sql.late-shipments");
    expect(late.rows.map((r) => Number(r[0])).sort((a, b) => a - b)).toEqual([2, 5, 7, 9, 11, 13]);

    const reviews = await run("sql.seller-sales-and-reviews");
    expect(
      reviews.rows
        .find((r) => r[0] === "TecnoSur")
        ?.slice(1, 4)
        .map(Number),
    ).toEqual([8, 5, 0]);
    expect(reviews.rows.find((r) => r[0] === "Verde Hogar")?.[4]).toBeNull();

    const sla = await run("sql.ticket-sla-breaches");
    expect(sla.rows.map((r) => Number(r[0])).sort()).toEqual([2, 4, 7]);

    const rooms = await run("sql.available-rooms");
    expect(rooms.rows.map((r) => `${r[0]} ${r[1]}`)).toEqual([
      "Hotel Bahía 102",
      "Hotel Bahía 201",
      "Posada del Cerro B",
    ]);
  }, 60_000);

  it("detecta respuestas incorrectas típicas", async () => {
    const byId = (id: string) => lab.exercises.find((e) => e.id === id)!;

    // Sin COALESCE se pierden los envíos que nunca se entregaron.
    const withoutCoalesce = await gradeSqlExercise(
      engine,
      byId("sql.late-shipments"),
      byId("sql.late-shipments").solution.replace(
        "COALESCE((d.delivered_at AT TIME ZONE 'UTC')::date, DATE '2026-11-15')",
        "(d.delivered_at AT TIME ZONE 'UTC')::date",
      ),
    );
    expect(withoutCoalesce.kind === "graded" && withoutCoalesce.outcome.correct).toBe(false);

    // Con extremos cerrados (<= y >=) las estadías que sólo se tocan parecen superpuestas.
    const closedRanges = await gradeSqlExercise(
      engine,
      byId("sql.available-rooms"),
      byId("sql.available-rooms")
        .solution.replace("b.check_in < DATE", "b.check_in <= DATE")
        .replace("b.check_out > DATE", "b.check_out >= DATE"),
    );
    expect(closedRanges.kind === "graded" && closedRanges.outcome.correct).toBe(false);

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
      "INSERT INTO payments (order_id, provider, external_id, amount_cents, paid_at) VALUES (17, 'x', 'y', 1, now()) ON CONFLICT DO NOTHING",
    );
    const after = await engine.execute("SELECT COUNT(*) FROM payments", { rollback: false });
    expect(after).toMatchObject({ ok: true });
    expect(before.ok && after.ok && lastResultSet(after.results)?.rows).toEqual(
      before.ok && lastResultSet(before.results)?.rows,
    );
  }, 60_000);
});
