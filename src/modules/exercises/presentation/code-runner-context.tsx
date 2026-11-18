"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CodeRunner } from "../application/code-runner";

const CodeRunnerContext = createContext<CodeRunner | null>(null);

/** Inyecta la implementación de ejecución de código (Web Worker en el navegador). */
export function CodeRunnerProvider({ runner, children }: { runner: CodeRunner; children: ReactNode }) {
  return <CodeRunnerContext.Provider value={runner}>{children}</CodeRunnerContext.Provider>;
}

export function useCodeRunner(): CodeRunner {
  const runner = useContext(CodeRunnerContext);
  if (!runner) throw new Error("useCodeRunner debe usarse dentro de <CodeRunnerProvider>.");
  return runner;
}
