"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { TOOL_NAMES, type ToolName } from "../domain/agent-config";
import type { EvalRunRecord } from "../domain/agent-lab-state";
import { SEED_WORLD } from "../domain/support-world";
import {
  CATEGORY_LABELS,
  CONCEPTS,
  pct,
  type CaseCategory,
  type Check,
  type ConceptId,
  type EvalCase,
  type QualityGate,
} from "../domain/evaluation";
import { useAgentLabActions, useAgentLabState } from "./agent-lab-context";

const input = "border-border bg-surface-2 text-foreground w-full rounded-md border px-2.5 py-1.5 text-sm";

/** Criterios de aceptación del quality gate (bloquea publicar versiones en el laboratorio). */
export function QualityGateSettings() {
  const { gate } = useAgentLabState();
  const actions = useAgentLabActions();
  const set = (patch: Partial<QualityGate>) => actions.setGate({ ...gate, ...patch });
  return (
    <Card>
      <CardTitle>Quality gate</CardTitle>
      <CardDescription>
        Criterios para poder publicar una versión. Se recalculan sobre la última evaluación guardada.
      </CardDescription>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={gate.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
          Activo
        </label>
        <label className="text-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={gate.requireCriticalCases}
            onChange={(e) => set({ requireCriticalCases: e.target.checked })}
          />
          Los casos críticos deben pasar siempre
        </label>
        <label className="block text-sm">
          <span className="text-muted mb-1 block text-xs">Aprobación mínima: {pct(gate.minPassRate)}</span>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={gate.minPassRate}
            onChange={(e) => set({ minPassRate: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="text-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={gate.useLowerBound}
            onChange={(e) => set({ useLowerBound: e.target.checked })}
          />
          Exigirla al límite inferior del intervalo (más estricto)
        </label>
        <label className="block text-sm">
          <span className="text-muted mb-1 block text-xs">Repeticiones mínimas por caso</span>
          <input
            type="number"
            min={1}
            max={20}
            className={input}
            value={gate.minRepetitions}
            onChange={(e) => set({ minRepetitions: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted mb-1 block text-xs">Latencia p95 máxima (ms, vacío = sin límite)</span>
          <input
            type="number"
            min={1}
            className={input}
            value={gate.maxP95LatencyMs ?? ""}
            onChange={(e) =>
              set({ maxP95LatencyMs: e.target.value ? Math.max(1, Number(e.target.value)) : null })
            }
          />
        </label>
      </div>
    </Card>
  );
}

/** Historial de evaluaciones de un agente: permite ver drift del modelo y regresiones de prompt a lo largo del tiempo. */
export function EvalHistory({ agentId }: { agentId: string }) {
  const { evalHistory } = useAgentLabState();
  const records = evalHistory.filter((r) => r.agentId === agentId);
  const data = records.map((r, i) => ({
    run: i + 1,
    label: versionLabel(r),
    aprobacion: Math.round(r.summary.passRate * 1000) / 10,
  }));
  return (
    <Card>
      <CardTitle>Historial de evaluaciones</CardTitle>
      <CardDescription>
        Misma suite a lo largo del tiempo. Si la tasa cae sin cambiar la versión, es <strong>drift</strong>{" "}
        del modelo o de los datos; si cae al cambiar el prompt, es una <strong>regresión de prompt</strong>.
      </CardDescription>
      {records.length === 0 ? (
        <p className="text-muted mt-3 text-sm">Todavía no hay evaluaciones guardadas para este agente.</p>
      ) : (
        <>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="run" stroke="var(--muted)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="var(--muted)" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  labelFormatter={(run) => data[Number(run) - 1]?.label ?? ""}
                />
                <Line type="monotone" dataKey="aprobacion" name="Aprobación %" stroke="var(--accent)" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
            {[...records].reverse().map((r) => (
              <li key={r.id} className="flex flex-wrap gap-2">
                <span className="text-muted tabular-nums">{new Date(r.at).toLocaleString("es-AR")}</span>
                <span className="text-foreground">{versionLabel(r)}</span>
                <span className="text-foreground tabular-nums">{pct(r.summary.passRate)}</span>
                <span className="text-muted">
                  {r.repetitions} rep. · {r.providerId}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}

function versionLabel(r: EvalRunRecord): string {
  return r.version === null ? "Borrador" : `v${r.version}`;
}

/** Editor de casos propios: conversación, cliente y verificaciones (deterministas, semánticas y de juez). */
export function CustomCaseEditor() {
  const { customCases } = useAgentLabState();
  const actions = useAgentLabActions();
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("c-001");
  const [turns, setTurns] = useState("");
  const [category, setCategory] = useState<CaseCategory>("functional");
  const [critical, setCritical] = useState(false);
  const [called, setCalled] = useState<ToolName[]>([]);
  const [notCalled, setNotCalled] = useState<ToolName[]>([]);
  const [concepts, setConcepts] = useState<ConceptId[]>([]);
  const [forbidden, setForbidden] = useState(true);
  const [rubric, setRubric] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const save = () => {
    const lines = turns
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const checks: Check[] = [
      ...called.map((tool) => ({ type: "tool_called" as const, tool })),
      ...notCalled.map((tool) => ({ type: "tool_not_called" as const, tool })),
      ...concepts.map((concept) => ({ type: "mentions" as const, concept })),
      ...(forbidden ? [{ type: "avoids_forbidden_phrases" as const }] : []),
      ...(rubric.trim().length >= 5 ? [{ type: "judge" as const, rubric: rubric.trim() }] : []),
    ];
    if (!title.trim() || lines.length === 0 || checks.length === 0) {
      setError("Completá el título, al menos un mensaje y al menos una verificación.");
      return;
    }
    const evalCase: EvalCase = {
      id: `custom-${Date.now().toString(36)}`,
      title: title.trim().slice(0, 120),
      description: "Caso propio.",
      category,
      critical,
      customerId,
      turns: lines.slice(0, 8).map((l) => l.slice(0, 500)),
      checks,
      origin: "custom",
    };
    try {
      actions.saveCustomCase(evalCase);
      setTitle("");
      setTurns("");
      setCalled([]);
      setNotCalled([]);
      setConcepts([]);
      setRubric("");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <Card>
      <CardTitle>Casos propios</CardTitle>
      <CardDescription>
        Agregá casos al golden dataset. Preferí verificaciones sobre herramientas y estado: son deterministas.
      </CardDescription>
      {customCases.length ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {customCases.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span className="text-foreground min-w-0 flex-1 truncate">{c.title}</span>
              <Badge>{CATEGORY_LABELS[c.category]}</Badge>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Borrar ${c.title}`}
                onClick={() => actions.deleteCustomCase(c.id)}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <details className="mt-3">
        <summary className="text-accent cursor-pointer text-sm font-medium">Nuevo caso</summary>
        <div className="mt-3 grid gap-3">
          <input
            className={input}
            placeholder="Título"
            aria-label="Título del caso"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className={input}
              aria-label="Cliente"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {SEED_WORLD.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.name}
                </option>
              ))}
            </select>
            <select
              className={input}
              aria-label="Categoría"
              value={category}
              onChange={(e) => setCategory(e.target.value as CaseCategory)}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className={`${input} min-h-20`}
            placeholder="Mensajes de la persona, uno por línea"
            aria-label="Mensajes de la persona"
            value={turns}
            onChange={(e) => setTurns(e.target.value)}
          />
          <label className="text-foreground flex items-center gap-2 text-sm">
            <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
            Crítico (debe pasar en todas las repeticiones)
          </label>
          <ChipGroup
            label="Debe llamar a (determinista)"
            options={TOOL_NAMES}
            selected={called}
            onToggle={(t) => setCalled(toggle(called, t))}
          />
          <ChipGroup
            label="No debe llamar a (determinista)"
            options={TOOL_NAMES}
            selected={notCalled}
            onToggle={(t) => setNotCalled(toggle(notCalled, t))}
          />
          <ChipGroup
            label="La respuesta debe mencionar (semántica)"
            options={Object.keys(CONCEPTS) as ConceptId[]}
            render={(c) => CONCEPTS[c].label}
            selected={concepts}
            onToggle={(c) => setConcepts(toggle(concepts, c))}
          />
          <label className="text-foreground flex items-center gap-2 text-sm">
            <input type="checkbox" checked={forbidden} onChange={(e) => setForbidden(e.target.checked)} />
            Sin frases prohibidas por la política
          </label>
          <input
            className={input}
            placeholder="Rúbrica para LLM as Judge (opcional, sólo con proveedor real)"
            aria-label="Rúbrica para LLM as Judge"
            value={rubric}
            maxLength={500}
            onChange={(e) => setRubric(e.target.value)}
          />
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <Button onClick={save}>
            <Plus aria-hidden /> Guardar caso
          </Button>
        </div>
      </details>
    </Card>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  render = (v) => v,
}: {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  render?: (value: T) => string;
}) {
  return (
    <fieldset>
      <legend className="text-muted mb-1 text-xs font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={selected.includes(option)}
            onClick={() => onToggle(option)}
            className={
              selected.includes(option)
                ? "bg-accent/20 text-accent border-accent/40 rounded-full border px-2.5 py-0.5 text-xs"
                : "border-border text-muted hover:text-foreground rounded-full border px-2.5 py-0.5 text-xs"
            }
          >
            {render(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
