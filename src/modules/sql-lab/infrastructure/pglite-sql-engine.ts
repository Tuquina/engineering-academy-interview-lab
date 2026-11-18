import { PGlite, type Results } from "@electric-sql/pglite";
import type { ExecOutcome, SqlEngine, TableSchema } from "../application/sql-engine";
import type { Cell, QueryResult, SqlError } from "../domain/sql-exercise";

const DATE_OID = 1082;

/** Convierte un valor devuelto por PGlite en una celda serializable y estable para comparar. */
function toCell(value: unknown, dataTypeId: number): Cell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date)
    return dataTypeId === DATE_OID ? value.toISOString().slice(0, 10) : value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (value instanceof Uint8Array)
    return `\\x${[...value].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  return JSON.stringify(value);
}

function toQueryResult(result: Results<unknown[]>): QueryResult {
  const columns = result.fields.map((f) => f.name);
  const rows = result.rows.map((row) =>
    row.map((value, i) => toCell(value, result.fields[i]?.dataTypeID ?? 0)),
  );
  return { columns, rows, affectedRows: result.affectedRows ?? null };
}

function toSqlError(error: unknown): SqlError {
  const e = error as { message?: string; code?: string; position?: string; hint?: string; detail?: string };
  const position = e.position ? Number(e.position) : null;
  return {
    message: e.message ?? String(error),
    code: e.code ?? null,
    position: Number.isFinite(position) ? position : null,
    hint: e.hint ?? null,
    detail: e.detail ?? null,
  };
}

/**
 * {@link SqlEngine} sobre PGlite (PostgreSQL real compilado a WebAssembly, en memoria).
 * En el navegador corre dentro de un Web Worker; en los tests del repositorio, directamente en Node.
 */
export class PgliteSqlEngine implements SqlEngine {
  private db: Promise<PGlite> | null = null;

  constructor(private readonly datasetSql: string) {}

  private database(): Promise<PGlite> {
    this.db ??= (async () => {
      const db = await PGlite.create();
      await db.exec(this.datasetSql);
      return db;
    })();
    return this.db;
  }

  async execute(sql: string, options: { rollback: boolean }): Promise<ExecOutcome> {
    const db = await this.database();
    const start = performance.now();
    if (options.rollback) await db.exec("BEGIN");
    try {
      const results = await db.exec(sql, { rowMode: "array" });
      return {
        ok: true,
        results: (results as Results<unknown[]>[]).map(toQueryResult),
        durationMs: Math.round(performance.now() - start),
      };
    } catch (error) {
      return { ok: false, error: toSqlError(error), durationMs: Math.round(performance.now() - start) };
    } finally {
      if (options.rollback) await db.exec("ROLLBACK").catch(() => undefined);
    }
  }

  async reset(): Promise<void> {
    const current = this.db;
    this.db = null;
    if (current) await (await current).close().catch(() => undefined);
    await this.database();
  }

  async describeSchema(): Promise<TableSchema[]> {
    const db = await this.database();
    const columns = await db.query<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`,
    );
    const tables = new Map<string, TableSchema["columns"][number][]>();
    for (const row of columns.rows) {
      const list = tables.get(row.table_name) ?? [];
      list.push({ name: row.column_name, type: row.data_type, nullable: row.is_nullable === "YES" });
      tables.set(row.table_name, list);
    }
    const names = [...tables.keys()];
    if (names.length === 0) return [];
    // Los nombres provienen del catálogo de PostgreSQL; igual se citan como identificadores.
    const counts = await db.query<{ name: string; count: string | number }>(
      names
        .map(
          (n) =>
            `SELECT '${n.replaceAll("'", "''")}' AS name, COUNT(*) AS count FROM "${n.replaceAll('"', '""')}"`,
        )
        .join(" UNION ALL "),
    );
    const countByName = new Map(counts.rows.map((r) => [r.name, Number(r.count)]));
    return names.map((name) => ({
      name,
      rowCount: countByName.get(name) ?? 0,
      columns: tables.get(name) ?? [],
    }));
  }
}
