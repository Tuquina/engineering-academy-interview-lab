"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SqlEngine } from "../application/sql-engine";

type SqlEngineFactory = (dataset: string) => SqlEngine;

const SqlEngineFactoryContext = createContext<SqlEngineFactory | null>(null);

/** Inyecta cómo crear el motor SQL (en el navegador, un Web Worker con PGlite). */
export function SqlEngineProvider({ factory, children }: { factory: SqlEngineFactory; children: ReactNode }) {
  return <SqlEngineFactoryContext.Provider value={factory}>{children}</SqlEngineFactoryContext.Provider>;
}

/** Un motor por dataset y por pestaña: se comparte entre el playground y los ejercicios. */
const engines = new Map<string, SqlEngine>();

export function useSqlEngine(dataset: string): SqlEngine {
  const factory = useContext(SqlEngineFactoryContext);
  if (!factory) throw new Error("useSqlEngine debe usarse dentro de <SqlEngineProvider>.");
  return useMemo(() => {
    let engine = engines.get(dataset);
    if (!engine) {
      engine = factory(dataset);
      engines.set(dataset, engine);
    }
    return engine;
  }, [dataset, factory]);
}
