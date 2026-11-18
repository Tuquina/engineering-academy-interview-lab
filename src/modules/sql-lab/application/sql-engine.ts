import {
  compareResults,
  lastResultSet,
  type GradeOutcome,
  type QueryResult,
  type SqlError,
  type SqlExercise,
} from "../domain/sql-exercise";

export type ExecOutcome =
  | { readonly ok: true; readonly results: readonly QueryResult[]; readonly durationMs: number }
  | { readonly ok: false; readonly error: SqlError; readonly durationMs: number };

export interface TableSchema {
  readonly name: string;
  readonly rowCount: number;
  readonly columns: ReadonlyArray<{ name: string; type: string; nullable: boolean }>;
}

/**
 * Puerto de un motor SQL aislado. La implementación del navegador usa PGlite (PostgreSQL compilado a WebAssembly)
 * en un Web Worker: las consultas del usuario nunca llegan a la base de datos de la plataforma.
 */
export interface SqlEngine {
  /** Ejecuta SQL. Con `rollback`, todo corre dentro de una transacción que se revierte al terminar. */
  execute(sql: string, options: { rollback: boolean }): Promise<ExecOutcome>;
  /** Vuelve el dataset a su estado inicial. */
  reset(): Promise<void>;
  describeSchema(): Promise<TableSchema[]>;
}

export type GradeResult =
  | { readonly kind: "graded"; readonly outcome: GradeOutcome; readonly userResults: readonly QueryResult[] }
  | { readonly kind: "user-error"; readonly error: SqlError }
  | { readonly kind: "reference-error"; readonly message: string };

/** Ejecuta las sentencias `times` veces seguidas, separadas por `;` (para verificar idempotencia). */
function repeat(sql: string, times: number): string {
  const statement = sql.trim().replace(/;\s*$/, "");
  return Array.from({ length: times }, () => `${statement};`).join("\n");
}

/**
 * Corrige un ejercicio SQL comparando la consulta del usuario con la solución de referencia, ambas ejecutadas sobre
 * el mismo dataset y dentro de transacciones que se revierten (el dataset no cambia al corregir).
 *
 * - Modo `result`: compara el último conjunto de resultados.
 * - Modo `state`: ejecuta la sentencia `runTimes` veces y compara el resultado de `checkQuery` después.
 */
export async function gradeSqlExercise(
  engine: SqlEngine,
  exercise: SqlExercise,
  userSql: string,
): Promise<GradeResult> {
  const build = (sql: string) =>
    exercise.check.mode === "state"
      ? `${repeat(sql, exercise.check.runTimes)}\n${exercise.check.checkQuery}`
      : sql;

  const reference = await engine.execute(build(exercise.solution), { rollback: true });
  if (!reference.ok) return { kind: "reference-error", message: reference.error.message };
  const expected = lastResultSet(reference.results);
  if (!expected)
    return { kind: "reference-error", message: "La solución de referencia no devolvió resultados." };

  const attempt = await engine.execute(build(userSql), { rollback: true });
  if (!attempt.ok) return { kind: "user-error", error: attempt.error };

  const orderMatters = exercise.check.mode === "result" && exercise.check.orderMatters;
  return {
    kind: "graded",
    outcome: compareResults(expected, lastResultSet(attempt.results), orderMatters),
    userResults: attempt.results,
  };
}
