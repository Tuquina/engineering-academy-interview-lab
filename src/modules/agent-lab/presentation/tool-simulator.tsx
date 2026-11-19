"use client";

import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { invokeTool } from "../application/invoke-tool";
import { exampleArgs, toolDefinitions } from "../application/tool-schemas";
import { DEFAULT_CONFIG, TOOL_LABELS, TOOL_NAMES, type ToolName } from "../domain/agent-config";
import { LAB_TODAY, SEED_WORLD, isIsoDate, type CollectionsWorld } from "../domain/collections-world";
import type { ToolCallTrace } from "../domain/conversation";
import { Json, ToolCallInspector } from "./tool-call-inspector";

/**
 * Tool Calling Simulator (MASTER_PROMPT §16.4): invocar las herramientas a mano, como lo haría un modelo, y ver
 * validación, resultado, errores, estado anterior y posterior y tiempo. El mundo se conserva entre llamadas.
 */
export function ToolSimulator() {
  const [world, setWorld] = useState<CollectionsWorld>(SEED_WORLD);
  const [customerId, setCustomerId] = useState("c-001");
  const [today, setToday] = useState(LAB_TODAY);
  const [tool, setTool] = useState<ToolName>("get_debt");
  const [enabled, setEnabled] = useState(true);
  const [args, setArgs] = useState(() =>
    JSON.stringify(exampleArgs("get_debt", "c-001", LAB_TODAY), null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [traces, setTraces] = useState<ToolCallTrace[]>([]);
  const definition = toolDefinitions([tool])[0]!;

  const choose = (next: ToolName, customer = customerId) => {
    setTool(next);
    setArgs(JSON.stringify(exampleArgs(next, customer, today), null, 2));
    setParseError(null);
  };

  const execute = () => {
    let input: unknown;
    try {
      input = JSON.parse(args);
    } catch (cause) {
      // Un modelo también puede devolver JSON inválido: en producción se responde con un tool_result de error.
      setParseError(`JSON inválido: ${cause instanceof Error ? cause.message : String(cause)}`);
      return;
    }
    setParseError(null);
    const { trace, world: next } = invokeTool({
      id: `sim-${traces.length + 1}`,
      name: tool,
      input,
      world,
      allowedTools: enabled ? TOOL_NAMES : TOOL_NAMES.filter((t) => t !== tool),
      today,
      policies: DEFAULT_CONFIG.policies,
      sessionCustomerId: customerId,
    });
    setWorld(next);
    setTraces((t) => [trace, ...t]);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <Card className="space-y-3">
        <CardTitle>Llamada</CardTitle>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="block">
            <span className="text-muted mb-1 block text-xs">Cliente de la conversación</span>
            <select
              className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                choose(tool, e.target.value);
              }}
            >
              {world.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted mb-1 block text-xs">Fecha simulada</span>
            <input
              type="date"
              className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
              value={today}
              onChange={(e) => isIsoDate(e.target.value) && setToday(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted mb-1 block text-xs">Herramienta</span>
          <select
            className="border-border bg-surface-2 text-foreground h-9 w-full rounded-md border px-2"
            value={tool}
            onChange={(e) => choose(e.target.value as ToolName)}
          >
            {TOOL_NAMES.map((t) => (
              <option key={t} value={t}>
                {TOOL_LABELS[t]} ({t})
              </option>
            ))}
          </select>
        </label>
        <p className="text-muted text-xs">{definition.description}</p>
        <label className="text-foreground flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Herramienta habilitada para el agente
        </label>
        <label className="block text-sm">
          <span className="text-muted mb-1 block text-xs">
            Argumentos (JSON, como los enviaría el modelo)
          </span>
          <textarea
            className="border-border bg-surface-2 text-foreground min-h-40 w-full rounded-md border p-2 font-mono text-xs"
            value={args}
            spellCheck={false}
            onChange={(e) => setArgs(e.target.value)}
          />
        </label>
        {parseError ? <p className="text-danger text-xs">{parseError}</p> : null}
        <div className="flex gap-2">
          <Button onClick={execute}>
            <Play aria-hidden /> Ejecutar
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setWorld(SEED_WORLD);
              setTraces([]);
            }}
          >
            <RotateCcw aria-hidden /> Reiniciar datos
          </Button>
        </div>
        <details>
          <summary className="text-muted cursor-pointer text-xs">JSON Schema que recibe el modelo</summary>
          <div className="mt-2">
            <Json value={definition.inputSchema} />
          </div>
        </details>
        <p className="text-muted text-xs">
          Probá romper el contrato: un monto como texto, una fecha fuera de plazo, otro{" "}
          <code>customerId</code> o una herramienta deshabilitada. Cada capa (habilitación, esquema, reglas de
          negocio) rechaza por un motivo distinto.
        </p>
      </Card>
      <div className="min-w-0 space-y-3">
        <CardDescription>
          Llamadas (la más reciente primero). Políticas: las de la configuración por defecto.
        </CardDescription>
        {traces.length === 0 ? (
          <p className="text-muted text-sm">Todavía no ejecutaste ninguna herramienta.</p>
        ) : null}
        {traces.map((trace, i) => (
          <ToolCallInspector key={trace.id} trace={trace} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
