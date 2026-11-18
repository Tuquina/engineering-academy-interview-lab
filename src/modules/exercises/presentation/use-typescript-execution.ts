"use client";

import type { Monaco } from "@monaco-editor/react";
import { useCallback, useState } from "react";
import { useCodeRunner } from "./code-runner-context";
import type { ExecutionView } from "./execution-result";
import { compileModels, ensureModel } from "./monaco-setup";

/** Límites de ejecución en el navegador (MASTER_PROMPT §19: tiempo, salida y recursos acotados). */
export const EXECUTION_LIMITS = {
  perTestTimeoutMs: 2_000,
  hardTimeoutMs: 15_000,
  scriptSettleMs: 3_000,
} as const;

export interface TypeScriptSources {
  /** Rutas de modelo (URIs) y contenido de cada archivo. */
  readonly solution: { path: string; content: string };
  readonly tests?: { path: string; content: string };
  readonly hiddenTests?: { path: string; content: string };
}

/**
 * Compila con el servicio de TypeScript de Monaco y ejecuta en el runner aislado (Web Worker).
 * Sin `tests` ejecuta el código como script (modo playground).
 */
export function useTypeScriptExecution() {
  const runner = useCodeRunner();
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<ExecutionView | null>(null);

  const execute = useCallback(
    async (monaco: Monaco, sources: TypeScriptSources): Promise<ExecutionView> => {
      setRunning(true);
      try {
        const files = [sources.solution, sources.tests, sources.hiddenTests].filter(
          (f): f is { path: string; content: string } => f !== undefined,
        );
        const models = files.map((f) => ensureModel(monaco, f.path, f.content));
        const { outputs, diagnostics } = await compileModels(monaco, models);
        const [solutionJs = "", testsJs, hiddenTestsJs] = outputs;
        const outcome = await runner.run(
          sources.tests
            ? {
                solutionJs,
                testsJs,
                hiddenTestsJs: sources.hiddenTests ? hiddenTestsJs : undefined,
                defaultTimeoutMs: EXECUTION_LIMITS.perTestTimeoutMs,
              }
            : {
                solutionJs,
                defaultTimeoutMs: EXECUTION_LIMITS.perTestTimeoutMs,
                settleMs: EXECUTION_LIMITS.scriptSettleMs,
              },
          EXECUTION_LIMITS.hardTimeoutMs,
        );
        // Sólo se informan errores de tipos del código del usuario y de los tests visibles.
        const visibleFiles = new Set(
          [sources.solution, sources.tests].filter(Boolean).map((f) => f!.path.split("/").at(-1)),
        );
        const next = { outcome, diagnostics: diagnostics.filter((d) => visibleFiles.has(d.file)) };
        setView(next);
        return next;
      } finally {
        setRunning(false);
      }
    },
    [runner],
  );

  return { execute, running, view, reset: () => setView(null) };
}
