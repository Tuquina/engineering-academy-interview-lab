"use client";

import { AlertTriangle, CheckCircle2, Clock, EyeOff, Terminal, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import type { ExecutionOutcome } from "../application/code-runner";
import type { LogEntry } from "../domain/run-exercise";
import { CATEGORY_LABELS, type TestResult } from "../domain/test-harness";
import type { TypeDiagnostic } from "./monaco-setup";

/** Resultado de compilar y ejecutar: lo que la UI necesita mostrar. */
export interface ExecutionView {
  readonly diagnostics: readonly TypeDiagnostic[];
  readonly outcome: ExecutionOutcome;
}

/** Salida de consola capturada en el entorno aislado. */
export function ConsoleOutput({ logs }: { logs: readonly LogEntry[] }) {
  if (logs.length === 0) return <p className="text-muted text-xs">Sin salida en consola.</p>;
  return (
    <ol className="bg-background border-border max-h-64 overflow-auto rounded-md border p-2 font-mono text-xs">
      {logs.map((log, index) => (
        <li
          key={index}
          className={cn(
            "flex gap-3 py-0.5 whitespace-pre-wrap",
            log.level === "error" && "text-danger",
            log.level === "warn" && "text-warning",
          )}
        >
          <span className="text-muted shrink-0 tabular-nums">{log.atMs} ms</span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{log.message}</span>
        </li>
      ))}
    </ol>
  );
}

export function TypeDiagnostics({ diagnostics }: { diagnostics: readonly TypeDiagnostic[] }) {
  if (diagnostics.length === 0) return null;
  return (
    <div role="alert" className="border-warning/40 bg-warning/8 rounded-md border p-3 text-sm">
      <p className="text-foreground mb-1 flex items-center gap-2 font-medium">
        <AlertTriangle aria-hidden className="text-warning size-4" />
        {diagnostics.length} {diagnostics.length === 1 ? "error de tipos" : "errores de tipos"}
      </p>
      <ul className="font-mono text-xs">
        {diagnostics.slice(0, 10).map((d, i) => (
          <li key={i} className="text-foreground/90 [overflow-wrap:anywhere]">
            {d.file}:{d.line}:{d.column} — {d.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusIcon({ status }: { status: TestResult["status"] }) {
  if (status === "passed")
    return <CheckCircle2 aria-label="Aprobado" className="text-success size-4 shrink-0" />;
  if (status === "timeout")
    return <Clock aria-label="Tiempo agotado" className="text-warning size-4 shrink-0" />;
  return <XCircle aria-label="Fallido" className="text-danger size-4 shrink-0" />;
}

/**
 * Resultado de una ejecución de tests: resumen, desglose por dimensión (correctitud, casos límite…), cada test con su
 * error, errores de tipos y consola. Sólo informa lo que realmente se ejecutó.
 */
export function TestResultPanel({ view }: { view: ExecutionView }) {
  const { outcome, diagnostics } = view;

  if (outcome.kind === "hard-timeout") {
    return (
      <div role="alert" className="border-danger/40 bg-danger/8 rounded-md border p-4 text-sm">
        <p className="text-foreground font-medium">
          La ejecución superó {outcome.limitMs / 1000} s y se detuvo.
        </p>
        <p className="text-muted mt-1">
          ¿Hay un bucle infinito o una promesa que nunca se resuelve sin timeout?
        </p>
      </div>
    );
  }
  if (outcome.kind === "crash") {
    return (
      <p role="alert" className="text-danger text-sm">
        El entorno de ejecución falló: {outcome.message}
      </p>
    );
  }

  const { report } = outcome;
  const results = report.results;
  const passed = results.filter((r) => r.status === "passed").length;
  const allPassed = report.status === "completed" && results.length > 0 && passed === results.length;
  const categories = [...new Set(results.map((r) => r.category))];

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <TypeDiagnostics diagnostics={diagnostics} />
      {report.error ? (
        <div role="alert" className="border-danger/40 bg-danger/8 rounded-md border p-3 text-sm">
          <p className="text-foreground font-medium">El código lanzó un error al cargarse</p>
          <p className="text-danger mt-1 font-mono text-xs [overflow-wrap:anywhere]">{report.error}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p
              role="status"
              className={cn(
                "text-base font-semibold",
                allPassed && diagnostics.length === 0 ? "text-success" : "text-foreground",
              )}
            >
              {passed}/{results.length} tests aprobados
            </p>
            <span className="text-muted text-xs">{report.durationMs} ms</span>
            {categories.map((category) => {
              const inCategory = results.filter((r) => r.category === category);
              const ok = inCategory.filter((r) => r.status === "passed").length;
              return (
                <Badge key={category} tone={ok === inCategory.length ? "success" : "warning"}>
                  {CATEGORY_LABELS[category]} {ok}/{inCategory.length}
                </Badge>
              );
            })}
          </div>
          <ul className="flex flex-col gap-1.5">
            {results.map((result, index) => (
              <li key={index} className="border-border rounded-md border px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <StatusIcon status={result.status} />
                  <span className="text-foreground flex-1">{result.name}</span>
                  {result.hidden && (
                    <Badge>
                      <EyeOff aria-hidden className="size-3" /> oculto
                    </Badge>
                  )}
                </div>
                {result.error && (
                  <p className="text-muted mt-1 pl-6 font-mono text-xs [overflow-wrap:anywhere]">
                    {result.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <div>
        <p className="text-muted mb-1 flex items-center gap-1.5 text-xs font-medium">
          <Terminal aria-hidden className="size-3.5" /> Consola
        </p>
        <ConsoleOutput logs={report.logs} />
      </div>
    </div>
  );
}

/** Indica si la ejecución cumple la condición de "resuelto": todos los tests aprobados y sin errores de tipos. */
export function isSolved(view: ExecutionView): { passed: number; total: number; solved: boolean } {
  if (view.outcome.kind !== "report") return { passed: 0, total: 0, solved: false };
  const results = view.outcome.report.results;
  const passed = results.filter((r) => r.status === "passed").length;
  const solved =
    view.outcome.report.status === "completed" &&
    results.length > 0 &&
    passed === results.length &&
    view.diagnostics.length === 0;
  return { passed, total: results.length, solved };
}
