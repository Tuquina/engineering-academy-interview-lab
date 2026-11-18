"use client";

import { AlertTriangle } from "lucide-react";
import type { ExecOutcome } from "../application/sql-engine";
import type { QueryResult, SqlError } from "../domain/sql-exercise";

const MAX_ROWS_SHOWN = 500;

/** Tabla de resultados. Limita las filas renderizadas para no congelar la página con resultados enormes. */
export function QueryResultTable({ result }: { result: QueryResult }) {
  if (result.columns.length === 0) {
    return (
      <p className="text-muted text-sm">
        Sentencia ejecutada{result.affectedRows !== null ? ` · ${result.affectedRows} filas afectadas` : ""}.
      </p>
    );
  }
  const shown = result.rows.slice(0, MAX_ROWS_SHOWN);
  return (
    <div className="flex flex-col gap-1">
      <div className="border-border max-h-[40vh] overflow-auto rounded-md border">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-surface-2 sticky top-0">
            <tr>
              {result.columns.map((column, i) => (
                <th
                  key={`${column}-${i}`}
                  scope="col"
                  className="text-foreground px-3 py-2 font-semibold whitespace-nowrap"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={r} className="border-border border-t">
                {row.map((cell, c) => (
                  <td key={c} className="px-3 py-1.5 whitespace-nowrap">
                    {cell === null ? <span className="text-muted italic">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted text-xs">
        {result.rows.length} {result.rows.length === 1 ? "fila" : "filas"}
        {result.rows.length > MAX_ROWS_SHOWN ? ` (se muestran las primeras ${MAX_ROWS_SHOWN})` : ""}
      </p>
    </div>
  );
}

/** Error de PostgreSQL con su posición marcada en la consulta, la pista y el detalle, si existen. */
export function SqlErrorView({ error, sql }: { error: SqlError; sql: string }) {
  let excerpt: { line: string; column: number; lineNumber: number } | null = null;
  if (error.position !== null) {
    const before = sql.slice(0, error.position - 1);
    const lineNumber = before.split("\n").length;
    const line = sql.split("\n")[lineNumber - 1] ?? "";
    excerpt = { line, column: before.length - before.lastIndexOf("\n") - 1, lineNumber };
  }
  return (
    <div role="alert" className="border-danger/40 bg-danger/8 rounded-md border p-3 text-sm">
      <p className="text-foreground flex items-start gap-2 font-medium">
        <AlertTriangle aria-hidden className="text-danger mt-0.5 size-4 shrink-0" />
        <span className="[overflow-wrap:anywhere]">{error.message}</span>
      </p>
      {excerpt && (
        <pre className="bg-background mt-2 overflow-x-auto rounded p-2 font-mono text-xs">
          {`línea ${excerpt.lineNumber}: ${excerpt.line}\n${" ".repeat(`línea ${excerpt.lineNumber}: `.length + excerpt.column)}^`}
        </pre>
      )}
      {error.hint && <p className="text-foreground/90 mt-2">Pista de PostgreSQL: {error.hint}</p>}
      {error.detail && <p className="text-muted mt-1">Detalle: {error.detail}</p>}
      {error.code && <p className="text-muted mt-1 font-mono text-xs">SQLSTATE {error.code}</p>}
    </div>
  );
}

/** Resultado completo de una ejecución (varias sentencias pueden producir varios resultados). */
export function ExecOutcomeView({ outcome, sql }: { outcome: ExecOutcome; sql: string }) {
  if (!outcome.ok) return <SqlErrorView error={outcome.error} sql={sql} />;
  const results = outcome.results.filter((r, i, all) => r.columns.length > 0 || i === all.length - 1);
  return (
    <div className="flex flex-col gap-4">
      {results.map((result, i) => (
        <QueryResultTable key={i} result={result} />
      ))}
      <p className="text-muted text-xs">
        Ejecutado en {outcome.durationMs} ms con PostgreSQL (PGlite) en tu navegador.
      </p>
    </div>
  );
}
