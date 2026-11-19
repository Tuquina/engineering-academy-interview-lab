"use client";

import { FlaskConical, Rocket, Square } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { runEvalSuite } from "../application/run-evals";
import type { AgentConfig } from "../domain/agent-config";
import { checkPublish, type AgentLabState } from "../domain/agent-lab-state";
import { findVersion, type AgentRecord } from "../domain/agent-registry";
import { BUILT_IN_CASES } from "../domain/eval-suite";
import { evaluateGate, summarize, type EvalCase } from "../domain/evaluation";
import { resolveProviders, useAgentLabActions, useAgentLabState, useAgentRuntime } from "./agent-lab-context";
import { CasesTable, SummaryCard, type VersionResult } from "./eval-results";
import { CustomCaseEditor, EvalHistory, QualityGateSettings } from "./eval-settings";
import { InfoNote, ProviderNotice } from "./provider-notice";

type Target = number | "draft";
const REMOTE_MAX_REPETITIONS = 3;

/**
 * Eval Playground (MASTER_PROMPT §16.7): ejecuta la suite sobre una o dos versiones de un agente, con repeticiones
 * reproducibles, y muestra aprobados, fallas, diferencias, variabilidad, latencia, costo (si hay datos reales) y el
 * quality gate.
 */
export function EvalPlayground() {
  const isClient = useIsClient();
  const state = useAgentLabState();
  const params = useSearchParams();
  const agents = Object.values(state.agents);
  const initialAgent =
    params.get("agent") && state.agents[params.get("agent")!] ? params.get("agent")! : agents[0]?.id;

  if (!isClient) return <p className="text-muted text-sm">Cargando agentes guardados en este navegador…</p>;
  if (!initialAgent)
    return <p className="text-muted text-sm">No hay agentes. Creá uno en el AI Agents Lab.</p>;
  return (
    <EvalWorkbench key={initialAgent} state={state} initialAgent={initialAgent} initialA={params.get("a")} />
  );
}

function EvalWorkbench({
  state,
  initialAgent,
  initialA,
}: {
  state: AgentLabState;
  initialAgent: string;
  initialA: string | null;
}) {
  const runtime = useAgentRuntime();
  const actions = useAgentLabActions();
  const router = useRouter();
  const [agentId, setAgentId] = useState(initialAgent);
  const agent = state.agents[agentId]!;
  const parseTarget = (value: string | null, fallback: Target): Target =>
    value === "draft" ? "draft" : value && findVersion(agent, Number(value)) ? Number(value) : fallback;
  const [a, setA] = useState<Target>(() => parseTarget(initialA, agent.publishedVersion ?? "draft"));
  const [b, setB] = useState<Target | "none">(() => defaultB(agent, a));
  const [repetitions, setRepetitions] = useState(5);
  const [baseSeed, setBaseSeed] = useState(1);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<{
    a: VersionResult;
    b: VersionResult | null;
    cases: EvalCase[];
    reps: number;
  } | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const configOf = (target: Target): AgentConfig =>
    target === "draft" ? agent.draft : (findVersion(agent, target)?.config ?? agent.draft);
  const allCases = [...BUILT_IN_CASES, ...state.customCases];
  const scenarioIds = configOf(a).evalScenarios;
  const cases = scenarioIds.length ? allCases.filter((c) => scenarioIds.includes(c.id)) : allCases;
  const usesRemote = [a, b].some(
    (t) => t !== "none" && resolveProviders(runtime, configOf(t)).provider.kind === "remote",
  );
  const effectiveReps = usesRemote ? Math.min(repetitions, REMOTE_MAX_REPETITIONS) : repetitions;
  const label = (t: Target) => (t === "draft" ? "Borrador" : `v${t}`);

  const evaluate = async (
    target: Target,
    offset: number,
    total: number,
    signal: AbortSignal,
  ): Promise<VersionResult> => {
    const config = configOf(target);
    const { provider, fallback } = resolveProviders(runtime, config);
    const runs = await runEvalSuite({
      config,
      cases,
      repetitions: effectiveReps,
      provider,
      fallbackProvider: fallback,
      baseSeed,
      judge: provider.kind === "remote" ? (runtime.judge ?? undefined) : undefined,
      signal,
      onProgress: (done) => setProgress({ done: offset + done, total }),
    });
    const summary = summarize(runs, cases);
    const model = provider.kind === "remote" ? config.model.model : null;
    if (!signal.aborted) {
      actions.recordEvalRun({
        id: `eval-${Date.now().toString(36)}-${label(target)}`,
        agentId: agent.id,
        version: target === "draft" ? null : target,
        providerId: provider.id,
        model,
        at: new Date().toISOString(),
        repetitions: effectiveReps,
        caseIds: cases.map((c) => c.id),
        summary,
      });
    }
    return {
      label: label(target),
      providerId: provider.id,
      simulated: provider.kind === "simulated",
      model,
      runs,
      summary,
      gate: evaluateGate(summary, effectiveReps, state.gate),
    };
  };

  const run = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setMessage(null);
    const total = cases.length * effectiveReps * (b === "none" ? 1 : 2);
    setProgress({ done: 0, total });
    try {
      const resultA = await evaluate(a, 0, total, controller.signal);
      const resultB =
        b === "none" ? null : await evaluate(b, cases.length * effectiveReps, total, controller.signal);
      if (controller.signal.aborted) {
        setMessage({ tone: "error", text: "Evaluación cancelada: no se guardaron resultados." });
      } else {
        setResults({ a: resultA, b: resultB, cases, reps: effectiveReps });
      }
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const publish = (version: number) => {
    try {
      actions.publish(agent.id, version);
      setMessage({ tone: "ok", text: `v${version} publicada.` });
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
    }
  };

  const options = [
    ...agent.versions.map((v) => ({
      value: String(v.number),
      label: `v${v.number}${agent.publishedVersion === v.number ? " (publicada)" : ""} — ${v.note}`,
    })),
    { value: "draft", label: "Borrador actual" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical aria-hidden className="size-4" /> Ejecutar la suite
        </CardTitle>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="text-muted mb-1 block text-xs">Agente</span>
            <select
              className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
              value={agentId}
              onChange={(e) => {
                const next = state.agents[e.target.value]!;
                setAgentId(next.id);
                const nextA: Target = next.publishedVersion ?? "draft";
                setA(nextA);
                setB(defaultB(next, nextA));
                setResults(null);
                router.replace(`/agents/evals?agent=${next.id}`);
              }}
            >
              {Object.values(state.agents).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted mb-1 block text-xs">Versión A</span>
            <select
              aria-label="Versión A"
              className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
              value={String(a)}
              onChange={(e) => setA(e.target.value === "draft" ? "draft" : Number(e.target.value))}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted mb-1 block text-xs">Versión B (opcional)</span>
            <select
              aria-label="Versión B"
              className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
              value={String(b)}
              onChange={(e) =>
                setB(
                  e.target.value === "none"
                    ? "none"
                    : e.target.value === "draft"
                      ? "draft"
                      : Number(e.target.value),
                )
              }
            >
              <option value="none">Sin comparación</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted mb-1 block text-xs">Repeticiones por caso</span>
            <input
              type="number"
              min={1}
              max={20}
              aria-label="Repeticiones por caso"
              className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
              value={repetitions}
              onChange={(e) => setRepetitions(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="block">
            <span className="text-muted mb-1 block text-xs">Semilla base</span>
            <input
              type="number"
              className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
              value={baseSeed}
              onChange={(e) => setBaseSeed(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <div className="mt-3 space-y-2">
          <ProviderNotice provider={resolveProviders(runtime, configOf(a)).provider} />
          {usesRemote ? (
            <InfoNote>
              Con un modelo real cada repetición consume tokens: se limita a {REMOTE_MAX_REPETITIONS}{" "}
              repeticiones por caso.
            </InfoNote>
          ) : null}
          <InfoNote>
            {cases.length} caso(s) × {effectiveReps} repetición(es){b === "none" ? "" : " × 2 versiones"}. La
            repetición N de cada caso usa la misma semilla en A y en B (comparación pareada). Con el proveedor
            local, la variabilidad proviene de la configuración <code>variability</code> de cada versión.
          </InfoNote>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => void run()} disabled={progress !== null}>
            <FlaskConical aria-hidden /> Ejecutar evaluación
          </Button>
          {progress ? (
            <>
              <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
                <Square aria-hidden /> Cancelar
              </Button>
              <progress
                className="h-2 w-48"
                value={progress.done}
                max={progress.total}
                aria-label="Progreso de la evaluación"
              />
              <span className="text-muted text-xs tabular-nums">
                {progress.done}/{progress.total}
              </span>
            </>
          ) : null}
        </div>
        {message ? (
          <p
            role="status"
            className={message.tone === "ok" ? "text-success mt-2 text-sm" : "text-danger mt-2 text-sm"}
          >
            {message.text}
          </p>
        ) : null}
      </Card>

      {results ? (
        <section aria-label="Resultados" className="space-y-4">
          <div className={results.b ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
            {[
              { result: results.a, target: a },
              ...(results.b ? [{ result: results.b, target: b as Target }] : []),
            ].map(({ result, target }) => (
              <div key={result.label} className="space-y-2">
                <SummaryCard result={result} repetitions={results.reps} />
                {typeof target === "number" && agent.publishedVersion !== target ? (
                  <PublishButton state={state} agentId={agent.id} version={target} onPublish={publish} />
                ) : null}
                {target === "draft" ? (
                  <p className="text-muted text-xs">
                    Para publicar, guardá el borrador como versión y evaluala.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <Card>
            <CardTitle>Casos</CardTitle>
            <CardDescription>
              Cada verificación indica su clase: <Badge>Determinista</Badge>{" "}
              <Badge>Semántica (heurística)</Badge> <Badge>LLM as Judge (probabilística)</Badge>. Las de juez
              se omiten con el proveedor local.
            </CardDescription>
            <div className="mt-3">
              <CasesTable cases={results.cases} a={results.a} b={results.b} />
            </div>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <QualityGateSettings />
        <EvalHistory agentId={agent.id} />
      </div>
      <CustomCaseEditor />
    </div>
  );
}

function PublishButton({
  state,
  agentId,
  version,
  onPublish,
}: {
  state: AgentLabState;
  agentId: string;
  version: number;
  onPublish: (version: number) => void;
}) {
  const check = checkPublish(state, agentId, version);
  return (
    <div>
      <Button size="sm" disabled={!check.allowed} onClick={() => onPublish(version)}>
        <Rocket aria-hidden /> Publicar v{version}
      </Button>
      {!check.allowed ? (
        <ul className="text-muted mt-1 list-disc pl-5 text-xs" aria-label="Por qué no se puede publicar">
          {check.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function defaultB(agent: AgentRecord, a: Target): Target | "none" {
  const latest = agent.versions.at(-1)?.number;
  if (latest !== undefined && latest !== a) return latest;
  return agent.versions.length > 1 ? agent.versions[0]!.number : "none";
}
