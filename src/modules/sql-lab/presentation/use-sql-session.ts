"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExecOutcome, TableSchema } from "../application/sql-engine";
import { useSqlEngine } from "./sql-engine-context";

/**
 * Estado de una sesión SQL: esquema, ejecución en curso y último resultado.
 * La primera carga inicializa PostgreSQL (WebAssembly) y el dataset; puede tardar unos segundos.
 */
export function useSqlSession(dataset: string) {
  const engine = useSqlEngine(dataset);
  const [schema, setSchema] = useState<TableSchema[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ sql: string; result: ExecOutcome } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    engine
      .describeSchema()
      .then((s) => !cancelled && setSchema(s))
      .catch(
        (error: unknown) =>
          !cancelled && setInitError(error instanceof Error ? error.message : String(error)),
      );
    return () => {
      cancelled = true;
    };
  }, [engine]);

  const execute = useCallback(
    async (sql: string, options: { rollback: boolean }) => {
      setBusy(true);
      try {
        const result = await engine.execute(sql, options);
        setOutcome({ sql, result });
        // Las sentencias sin rollback pueden cambiar cantidades de filas o crear tablas.
        if (!options.rollback) setSchema(await engine.describeSchema());
        return result;
      } finally {
        setBusy(false);
      }
    },
    [engine],
  );

  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await engine.reset();
      setSchema(await engine.describeSchema());
      setOutcome(null);
    } finally {
      setBusy(false);
    }
  }, [engine]);

  return { engine, schema, busy, outcome, execute, reset, initError };
}
