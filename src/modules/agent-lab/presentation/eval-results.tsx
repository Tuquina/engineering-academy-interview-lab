"use client";

import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import {
  CATEGORY_LABELS,
  compareCase,
  pct,
  type CaseComparison,
  type CaseRun,
  type CaseSummary,
  type CheckKind,
  type EvalCase,
  type GateResult,
  type SuiteSummary,
} from "../domain/evaluation";
import { PRICING_SOURCE, estimateCostUsd } from "../domain/pricing";

export interface VersionResult {
  readonly label: string;
  readonly providerId: string;
  readonly simulated: boolean;
  readonly model: string | null;
  readonly runs: readonly CaseRun[];
  readonly summary: SuiteSummary;
  readonly gate: GateResult;
}

export const KIND_LABELS: Record<CheckKind, string> = {
  deterministic: "Determinista",
  semantic: "Semántica (heurística)",
  judge: "LLM as Judge (probabilística)",
};

/** Tarjeta resumen de una versión evaluada. */
export function SummaryCard({ result, repetitions }: { result: VersionResult; repetitions: number }) {
  const { summary } = result;
  const cost = estimateCostUsd(summary.usage, result.simulated ? null : result.model);
  return (
    <Card data-testid={`summary-${result.label}`}>
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>{result.label}</CardTitle>
        <Badge tone={result.gate.passed ? "success" : "warning"}>
          {result.gate.passed ? "Quality gate aprobado" : "Quality gate no aprobado"}
        </Badge>
      </div>
      <CardDescription>
        {result.simulated ? "Proveedor local determinista (simulación)" : `Modelo real: ${result.model}`} ·{" "}
        {repetitions} repetición(es) por caso
      </CardDescription>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        <Stat
          label="Aprobación"
          value={pct(summary.passRate)}
          hint={`IC 95 %: ${pct(summary.interval.low)}–${pct(summary.interval.high)}`}
        />
        <Stat label="Ejecuciones" value={`${summary.passes}/${summary.runs}`} />
        <Stat
          label="Casos inestables"
          value={String(summary.flakyCases)}
          hint="Pasan en unas repeticiones y fallan en otras"
        />
        <Stat label="Críticos fallidos" value={String(summary.criticalFailures.length)} />
        <Stat
          label="Latencia p50 / p95"
          value={`${ms(summary.latencyP50Ms)} / ${ms(summary.latencyP95Ms)}`}
          hint="Medida en este navegador"
        />
        <Stat
          label="Costo estimado"
          value={cost === null ? "—" : `US$ ${cost.toFixed(4)}`}
          hint={
            cost === null
              ? "Sin datos reales de tokens (proveedor local)"
              : `${summary.usage!.inputTokens + summary.usage!.outputTokens} tokens; precios de referencia`
          }
        />
      </dl>
      {!result.gate.passed ? (
        <ul className="text-warning mt-3 list-disc pl-5 text-xs">
          {result.gate.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
      {cost !== null ? (
        <p className="text-muted mt-2 text-xs">
          Precios de lista de referencia;{" "}
          <a href={PRICING_SOURCE} className="text-accent hover:underline" target="_blank" rel="noreferrer">
            verificá los vigentes
          </a>
          .
        </p>
      ) : null}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint}>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="text-foreground font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className="text-muted text-[11px]">{hint}</dd> : null}
    </div>
  );
}

function ms(value: number): string {
  return value < 10 ? `${value.toFixed(1)} ms` : `${Math.round(value)} ms`;
}

const COMPARISON_LABELS: Record<CaseComparison, { label: string; tone: "success" | "warning" | "neutral" }> =
  {
    improved: { label: "Mejora", tone: "success" },
    regressed: { label: "Regresión", tone: "warning" },
    same: { label: "Igual", tone: "neutral" },
    noise: { label: "Dentro del ruido", tone: "neutral" },
  };

/** Tabla de casos: resultado por versión, comparación con control de falsos positivos y detalle por caso. */
export function CasesTable({
  cases,
  a,
  b,
}: {
  cases: readonly EvalCase[];
  a: VersionResult;
  b: VersionResult | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const byId = (summary: SuiteSummary, id: string) => summary.cases.find((c) => c.caseId === id);
  const selectedCase = cases.find((c) => c.id === selected);
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-muted text-xs">
            <tr>
              <th className="py-2 pr-3 font-medium">Caso</th>
              <th className="py-2 pr-3 font-medium">{a.label}</th>
              {b ? <th className="py-2 pr-3 font-medium">{b.label}</th> : null}
              {b ? <th className="py-2 pr-3 font-medium">Comparación</th> : null}
              <th className="py-2 font-medium">Fallas más frecuentes</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const sa = byId(a.summary, c.id);
              const sb = b ? byId(b.summary, c.id) : undefined;
              if (!sa) return null;
              const comparison = sb ? compareCase(sa, sb) : null;
              const failures = [...(sa.failures ?? []), ...(sb?.failures ?? [])];
              return (
                <tr
                  key={c.id}
                  className={cn(
                    "border-border hover:bg-surface-2/50 cursor-pointer border-t align-top",
                    selected === c.id && "bg-surface-2/70",
                  )}
                  onClick={() => setSelected(c.id === selected ? null : c.id)}
                >
                  <td className="py-2 pr-3">
                    <button type="button" className="text-foreground text-left font-medium hover:underline">
                      {c.title}
                    </button>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      <Badge>{CATEGORY_LABELS[c.category]}</Badge>
                      {c.critical ? <Badge tone="warning">Crítico</Badge> : null}
                      {c.origin === "custom" ? <Badge tone="violet">Propio</Badge> : null}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <PassCell summary={sa} />
                  </td>
                  {b ? <td className="py-2 pr-3">{sb ? <PassCell summary={sb} /> : "—"}</td> : null}
                  {b ? (
                    <td className="py-2 pr-3">
                      {comparison ? (
                        <Badge tone={COMPARISON_LABELS[comparison].tone}>
                          {COMPARISON_LABELS[comparison].label}
                        </Badge>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="text-muted py-2 text-xs">
                    {failures.length === 0
                      ? "—"
                      : dedupe(failures)
                          .slice(0, 2)
                          .map((f) => (
                            <span key={f.label} className="block">
                              {f.label} <span className="opacity-70">({KIND_LABELS[f.kind]})</span>
                            </span>
                          ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {b ? (
        <p className="text-muted text-xs">
          Una diferencia se declara mejora o regresión sólo si los intervalos de confianza del 95 % no se
          superponen. Con pocas repeticiones casi todo queda &quot;dentro del ruido&quot;: así se controlan
          los falsos positivos.
        </p>
      ) : null}
      {selectedCase ? (
        <CaseDetail evalCase={selectedCase} a={a} b={b} />
      ) : (
        <p className="text-muted text-sm">
          Elegí un caso para ver cada repetición: respuestas, herramientas y verificaciones.
        </p>
      )}
    </div>
  );
}

function dedupe<T extends { label: string; count: number }>(items: readonly T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const existing = map.get(item.label);
    map.set(item.label, existing ? { ...existing, count: existing.count + item.count } : item);
  }
  return [...map.values()].sort((x, y) => y.count - x.count);
}

function PassCell({ summary }: { summary: CaseSummary }) {
  return (
    <div>
      <span
        className={cn(
          "font-semibold tabular-nums",
          summary.passes === summary.runs
            ? "text-success"
            : summary.passes === 0
              ? "text-danger"
              : "text-warning",
        )}
      >
        {summary.passes}/{summary.runs}
      </span>
      <span className="text-muted ml-1 text-xs">
        IC {pct(summary.interval.low)}–{pct(summary.interval.high)}
      </span>
      {summary.flaky ? (
        <Badge tone="warning" className="ml-1">
          Inestable
        </Badge>
      ) : null}
    </div>
  );
}

function CaseDetail({ evalCase, a, b }: { evalCase: EvalCase; a: VersionResult; b: VersionResult | null }) {
  return (
    <Card>
      <CardTitle>{evalCase.title}</CardTitle>
      <CardDescription>{evalCase.description}</CardDescription>
      <p className="text-muted mt-2 text-xs">
        Cliente {evalCase.customerId} · Mensajes: {evalCase.turns.map((t) => `"${t}"`).join(" → ")}
      </p>
      <div className={cn("mt-3 grid gap-4", b && "lg:grid-cols-2")}>
        {[a, b]
          .filter((r): r is VersionResult => r !== null)
          .map((result) => {
            const runs = result.runs.filter((r) => r.caseId === evalCase.id);
            const distinct = new Set(runs.map((r) => r.replies.join(" | "))).size;
            return (
              <div key={result.label} className="min-w-0">
                <h4 className="text-foreground text-sm font-semibold">{result.label}</h4>
                <p className="text-muted mb-2 text-xs">
                  Variabilidad: {distinct} respuesta(s) distinta(s) en {runs.length} repetición(es).
                </p>
                <ol className="space-y-2">
                  {runs.map((run) => (
                    <li
                      key={run.repetition}
                      className="border-border rounded-md border p-2 text-xs"
                      data-testid="eval-run"
                    >
                      <div className="flex items-center gap-2">
                        {run.passed ? (
                          <CheckCircle2 aria-label="Aprobada" className="text-success size-4" />
                        ) : (
                          <XCircle aria-label="Fallida" className="text-danger size-4" />
                        )}
                        <span className="text-foreground font-medium">Repetición {run.repetition + 1}</span>
                        <span className="text-muted">semilla {run.seed}</span>
                      </div>
                      {run.replies.map((reply, i) => (
                        <p key={i} className="text-foreground mt-1">
                          <span className="text-muted">Agente:</span> {reply}
                        </p>
                      ))}
                      <p className="text-muted mt-1">
                        Herramientas:{" "}
                        {run.toolCalls.length
                          ? run.toolCalls.map((t) => `${t.name} (${t.status})`).join(", ")
                          : "ninguna"}
                      </p>
                      {run.error ? <p className="text-danger mt-1">{run.error}</p> : null}
                      <ul className="mt-1 space-y-0.5">
                        {run.checks.map((check, i) => (
                          <li key={i} className="flex gap-1.5">
                            {check.status === "passed" ? (
                              <CheckCircle2
                                aria-label="Cumple"
                                className="text-success mt-0.5 size-3 shrink-0"
                              />
                            ) : check.status === "failed" ? (
                              <XCircle
                                aria-label="No cumple"
                                className="text-danger mt-0.5 size-3 shrink-0"
                              />
                            ) : (
                              <CircleSlash
                                aria-label="Omitida"
                                className="text-muted mt-0.5 size-3 shrink-0"
                              />
                            )}
                            <span>
                              <span className="text-foreground">{check.label}</span>{" "}
                              <span className="text-muted">
                                [{KIND_LABELS[check.kind]}] {check.detail}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
      </div>
    </Card>
  );
}
