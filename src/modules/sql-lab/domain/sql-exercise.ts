import type { Difficulty } from "@/modules/learning/domain/catalog-types";

/** Valor de una celda ya normalizado para la UI y la comparación (fechas como ISO, bigint como texto). */
export type Cell = string | number | boolean | null;

export interface QueryResult {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly Cell[])[];
  readonly affectedRows: number | null;
}

/** Error de PostgreSQL con la información que ayuda a corregirlo. */
export interface SqlError {
  readonly message: string;
  readonly code: string | null;
  /** Posición (1-based, en caracteres) dentro de la consulta enviada, si PostgreSQL la informa. */
  readonly position: number | null;
  readonly hint: string | null;
  readonly detail: string | null;
}

export interface SqlExercise {
  readonly id: string;
  readonly title: string;
  readonly difficulty: Difficulty;
  readonly order: number;
  readonly topics: readonly string[];
  readonly hints: readonly string[];
  /** Enunciado (Markdown/MDX). */
  readonly prompt: string;
  /** Explicación de la solución (Markdown/MDX). */
  readonly explanation: string;
  readonly solution: string;
  readonly check:
    | { readonly mode: "result"; readonly orderMatters: boolean }
    | { readonly mode: "state"; readonly checkQuery: string; readonly runTimes: number };
}

export interface GradeOutcome {
  readonly correct: boolean;
  readonly message: string;
  /** Observaciones que no hacen fallar la corrección (por ejemplo, nombres de columnas distintos). */
  readonly notes: readonly string[];
}

/** Representación comparable de una celda: igualdad por valor, no por tipo JS (numeric llega como texto). */
function cellKey(cell: Cell): string {
  if (cell === null) return "NULL";
  if (typeof cell === "number")
    return Number.isInteger(cell) ? String(cell) : String(Number(cell.toFixed(10)));
  if (typeof cell === "string" && /^-?\d+(\.\d+)?$/.test(cell)) return String(Number(cell));
  return String(cell);
}

const rowKey = (row: readonly Cell[]): string => JSON.stringify(row.map(cellKey));

/** Último conjunto de resultados con columnas (las consultas pueden incluir varias sentencias). */
export function lastResultSet(results: readonly QueryResult[]): QueryResult | null {
  for (let i = results.length - 1; i >= 0; i--) {
    const result = results[i];
    if (result && result.columns.length > 0) return result;
  }
  return null;
}

/**
 * Compara el resultado del usuario con el esperado.
 *
 * - Compara valores, no tipos de JavaScript (un `numeric` puede llegar como texto).
 * - Si el orden no importa, compara multiconjuntos de filas (respeta duplicados).
 * - Los nombres de columna distintos se informan como nota, no como error: lo importante es el dato.
 */
export function compareResults(
  expected: QueryResult,
  actual: QueryResult | null,
  orderMatters: boolean,
): GradeOutcome {
  if (!actual) {
    return {
      correct: false,
      message: "Tu consulta no devolvió filas ni columnas: ¿falta un SELECT?",
      notes: [],
    };
  }
  const notes: string[] = [];
  if (actual.columns.length !== expected.columns.length) {
    return {
      correct: false,
      message: `Se esperaban ${expected.columns.length} columnas (${expected.columns.join(", ")}) y tu consulta devuelve ${actual.columns.length} (${actual.columns.join(", ")}).`,
      notes,
    };
  }
  const renamed = expected.columns.filter((c, i) => c.toLowerCase() !== actual.columns[i]?.toLowerCase());
  if (renamed.length > 0) {
    notes.push(
      `Los nombres de columna difieren de los pedidos (${expected.columns.join(", ")}); en una entrevista conviene respetarlos.`,
    );
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      correct: false,
      message: `Tu consulta devuelve ${actual.rows.length} filas y se esperaban ${expected.rows.length}.`,
      notes,
    };
  }

  const expectedKeys = expected.rows.map(rowKey);
  const actualKeys = actual.rows.map(rowKey);
  if (orderMatters) {
    const index = expectedKeys.findIndex((key, i) => key !== actualKeys[i]);
    if (index === -1)
      return { correct: true, message: "¡Correcto! El resultado coincide, incluido el orden.", notes };
    const sameSet = [...expectedKeys].sort().join() === [...actualKeys].sort().join();
    return {
      correct: false,
      message: sameSet
        ? "Las filas son correctas pero el orden no: revisá el ORDER BY."
        : `La fila ${index + 1} no coincide con la esperada.`,
      notes,
    };
  }

  const remaining = new Map<string, number>();
  expectedKeys.forEach((key) => remaining.set(key, (remaining.get(key) ?? 0) + 1));
  for (const key of actualKeys) {
    const count = remaining.get(key) ?? 0;
    if (count === 0) {
      return {
        correct: false,
        message: "Hay filas en tu resultado que no están en el esperado (o difieren en algún valor).",
        notes,
      };
    }
    remaining.set(key, count - 1);
  }
  return { correct: true, message: "¡Correcto! El resultado coincide con el esperado.", notes };
}
