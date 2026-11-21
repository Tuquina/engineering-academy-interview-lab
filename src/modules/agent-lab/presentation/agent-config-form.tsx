"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { TOOL_DESCRIPTIONS } from "../application/tool-schemas";
import {
  REMOTE_MODELS,
  RUNTIME_VARIABLES,
  TONE_LABELS,
  TOOL_LABELS,
  TOOL_NAMES,
  promptVariables,
  renderSystemPrompt,
  validateConfig,
  type AgentConfig,
  type Tone,
  type ToolName,
} from "../domain/agent-config";
import { BUILT_IN_CASES } from "../domain/eval-suite";
import { useAgentLabState, useAgentRuntime } from "./agent-lab-context";

const inputClass =
  "border-border bg-surface-2 text-foreground w-full rounded-md border px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring";

/**
 * Editor del borrador de un agente (MASTER_PROMPT §16.3): identidad, system prompt, objetivo, herramientas, reglas,
 * políticas, voz, variables, memoria, modelo y escenarios de evaluación. Los cambios se guardan en el borrador al
 * instante; una versión se congela desde la pestaña Versiones.
 */
export function AgentConfigForm({
  config,
  onChange,
}: {
  config: AgentConfig;
  onChange: (next: AgentConfig) => void;
}) {
  const runtime = useAgentRuntime();
  const { customCases } = useAgentLabState();
  const issues = validateConfig(config);
  const set = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) =>
    onChange({ ...config, [key]: value });
  const setIn = <K extends "identity" | "voice" | "policies" | "memory" | "model">(
    key: K,
    patch: Partial<AgentConfig[K]>,
  ) => onChange({ ...config, [key]: { ...config[key], ...patch } });

  const preview = renderSystemPrompt(config, {
    today: "05/03/2026",
    customer_name: "Lucía Fernández",
    customer_id: "c-001",
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {issues.length ? (
        <div
          role="alert"
          className="border-warning/40 bg-warning/10 rounded-md border p-3 text-sm xl:col-span-2"
        >
          <p className="text-foreground font-medium">La configuración tiene problemas:</p>
          <ul className="text-muted mt-1 list-disc pl-5">
            {issues.map((issue) => (
              <li key={issue.field + issue.message}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card>
        <CardTitle>Identidad y voz</CardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del agente">
            <input
              className={inputClass}
              value={config.identity.agentName}
              maxLength={60}
              onChange={(e) => setIn("identity", { agentName: e.target.value })}
            />
          </Field>
          <Field label="Empresa">
            <input
              className={inputClass}
              value={config.identity.companyName}
              maxLength={80}
              onChange={(e) => setIn("identity", { companyName: e.target.value })}
            />
          </Field>
          <Field label="Rol">
            <input
              className={inputClass}
              value={config.identity.role}
              maxLength={120}
              onChange={(e) => setIn("identity", { role: e.target.value })}
            />
          </Field>
          <Field label="Tono">
            <select
              className={inputClass}
              value={config.identity.tone}
              onChange={(e) => setIn("identity", { tone: e.target.value as Tone })}
            >
              {Object.entries(TONE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset className="border-border mt-4 rounded-md border p-3">
          <legend className="text-muted px-1 text-xs font-semibold">Voz (para canales de voz)</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Check
              label="Canal de voz habilitado"
              checked={config.voice.enabled}
              onChange={(v) => setIn("voice", { enabled: v })}
            />
            <Field label="Voz">
              <select
                className={inputClass}
                value={config.voice.voiceId}
                onChange={(e) => setIn("voice", { voiceId: e.target.value })}
              >
                {["es-AR-female-1", "es-AR-male-1", "es-MX-female-1", "es-MX-male-1"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Velocidad">
              <NumberInput
                value={config.voice.speakingRate}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(v) => setIn("voice", { speakingRate: v })}
              />
            </Field>
            <Field label="Estilo">
              <select
                className={inputClass}
                value={config.voice.style}
                onChange={(e) => setIn("voice", { style: e.target.value as AgentConfig["voice"]["style"] })}
              >
                <option value="calm">Calmo</option>
                <option value="warm">Cálido</option>
                <option value="energetic">Enérgico</option>
              </select>
            </Field>
          </div>
          <p className="text-muted mt-2 text-xs">
            La voz es una propiedad versionada de la configuración: el laboratorio no sintetiza audio.
          </p>
        </fieldset>
      </Card>

      <Card>
        <CardTitle>Prompt y objetivo</CardTitle>
        <Field label="System prompt (variables con {{nombre}})" className="mt-3">
          <textarea
            className={cn(inputClass, "min-h-40 font-mono text-xs")}
            value={config.systemPrompt}
            maxLength={8000}
            onChange={(e) => set("systemPrompt", e.target.value)}
          />
        </Field>
        <p className="text-muted mt-1 text-xs">
          Variables usadas:{" "}
          {promptVariables(config.systemPrompt).map((v) => (
            <Badge
              key={v}
              tone={RUNTIME_VARIABLES.includes(v as never) ? "violet" : "neutral"}
              className="mr-1"
            >
              {v}
            </Badge>
          ))}
          <span className="block">Las violetas las completa el sistema en cada conversación.</span>
        </p>
        <Field label="Objetivo" className="mt-3">
          <textarea
            className={cn(inputClass, "min-h-16")}
            value={config.objective}
            maxLength={1000}
            onChange={(e) => set("objective", e.target.value)}
          />
        </Field>
        <LinesField
          label="Reglas (una por línea)"
          lines={config.rules}
          onCommit={(rules) => set("rules", rules)}
        />
      </Card>

      <Card>
        <CardTitle>Herramientas permitidas</CardTitle>
        <CardDescription>
          El modelo sólo recibe las habilitadas; una llamada a otra se rechaza igual.
        </CardDescription>
        <ul className="mt-3 space-y-2">
          {TOOL_NAMES.map((tool) => (
            <li key={tool}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={config.tools.includes(tool)}
                  onChange={(e) =>
                    set(
                      "tools",
                      e.target.checked
                        ? TOOL_NAMES.filter((t) => t === tool || config.tools.includes(t))
                        : config.tools.filter((t) => t !== tool),
                    )
                  }
                />
                <span>
                  <span className="text-foreground font-medium">{TOOL_LABELS[tool]}</span>{" "}
                  <code className="text-muted font-mono text-xs">{tool}</code>
                  <span className="text-muted block text-xs">{TOOL_DESCRIPTIONS[tool as ToolName]}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Políticas</CardTitle>
        <CardDescription>
          Se hacen cumplir en las herramientas y se verifican en las evaluaciones.
        </CardDescription>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Check
            label="Presentarse como asistente virtual"
            checked={config.policies.discloseAiIdentity}
            onChange={(v) => setIn("policies", { discloseAiIdentity: v })}
          />
          <Check
            label="Escalar si no reconoce un cargo"
            checked={config.policies.escalateOnDispute}
            onChange={(v) => setIn("policies", { escalateOnDispute: v })}
          />
          <Field label="Plazo máximo para el retiro (días desde hoy)">
            <NumberInput
              value={config.policies.maxPickupDays}
              min={1}
              max={30}
              onChange={(v) => setIn("policies", { maxPickupDays: v })}
            />
          </Field>
          <Field label="Plazo de devolución (días desde la entrega)">
            <NumberInput
              value={config.policies.returnWindowDays}
              min={1}
              max={90}
              onChange={(v) => setIn("policies", { returnWindowDays: v })}
            />
          </Field>
          <Field label="Cupón máximo por demora (%)">
            <NumberInput
              value={config.policies.maxCouponPercent}
              min={0}
              max={50}
              onChange={(v) => setIn("policies", { maxCouponPercent: v })}
            />
          </Field>
          <Field label="Horario de contacto (desde / hasta)">
            <div className="flex gap-2">
              <NumberInput
                value={config.policies.contactHourStart}
                min={0}
                max={23}
                onChange={(v) => setIn("policies", { contactHourStart: v })}
              />
              <NumberInput
                value={config.policies.contactHourEnd}
                min={1}
                max={24}
                onChange={(v) => setIn("policies", { contactHourEnd: v })}
              />
            </div>
          </Field>
        </div>
        <LinesField
          label="Frases prohibidas (una por línea)"
          lines={config.policies.forbiddenPhrases}
          onCommit={(forbiddenPhrases) => setIn("policies", { forbiddenPhrases })}
        />
      </Card>

      <Card>
        <CardTitle>Variables del prompt</CardTitle>
        <CardDescription>
          Valores por cliente o tenant (por ejemplo, el nombre de la empresa).
        </CardDescription>
        <VariablesEditor variables={config.variables} onChange={(variables) => set("variables", variables)} />
        <CardTitle className="mt-5">Memoria</CardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Check
            label="Memoria de largo plazo (entre conversaciones)"
            checked={config.memory.longTerm}
            onChange={(v) => setIn("memory", { longTerm: v })}
          />
          <Field label="Ventana de corto plazo (mensajes previos)">
            <NumberInput
              value={config.memory.windowMessages}
              min={1}
              max={100}
              onChange={(v) => setIn("memory", { windowMessages: v })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Modelo, reintentos y fallback</CardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Proveedor">
            <select
              className={inputClass}
              value={config.model.provider}
              onChange={(e) =>
                setIn("model", { provider: e.target.value as AgentConfig["model"]["provider"] })
              }
            >
              <option value="local">Local determinista (simulación)</option>
              <option value="anthropic" disabled={!runtime.remote}>
                Anthropic (real){runtime.remote ? "" : " — sin API key en el servidor"}
              </option>
            </select>
          </Field>
          <Field label="Modelo (proveedor real)">
            <select
              className={inputClass}
              value={config.model.model}
              onChange={(e) => setIn("model", { model: e.target.value })}
            >
              {REMOTE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Variabilidad simulada: ${config.model.variability.toFixed(2)} (sólo local)`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.model.variability}
              onChange={(e) => setIn("model", { variability: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label="Pasos máximos por turno">
            <NumberInput
              value={config.model.maxSteps}
              min={1}
              max={8}
              onChange={(v) => setIn("model", { maxSteps: v })}
            />
          </Field>
          <Field label="Timeout por llamada (ms)">
            <NumberInput
              value={config.model.timeoutMs}
              min={1000}
              max={120000}
              step={1000}
              onChange={(v) => setIn("model", { timeoutMs: v })}
            />
          </Field>
          <Field label="Reintentos ante errores transitorios">
            <NumberInput
              value={config.model.retries}
              min={0}
              max={3}
              onChange={(v) => setIn("model", { retries: v })}
            />
          </Field>
          <Check
            label="Si el proveedor real falla, responder con el local"
            checked={config.model.fallbackToLocal}
            onChange={(v) => setIn("model", { fallbackToLocal: v })}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Escenarios de evaluación</CardTitle>
        <CardDescription>
          Casos que se ejecutan para este agente. Sin selección se ejecutan todos.
        </CardDescription>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {[...BUILT_IN_CASES, ...customCases].map((c) => (
            <li key={c.id}>
              <Check
                label={`${c.title}${c.critical ? " (crítico)" : ""}`}
                checked={config.evalScenarios.includes(c.id)}
                onChange={(v) =>
                  set(
                    "evalScenarios",
                    v ? [...config.evalScenarios, c.id] : config.evalScenarios.filter((id) => id !== c.id),
                  )
                }
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="xl:col-span-2">
        <details>
          <summary className="text-foreground cursor-pointer font-semibold">
            System prompt final (lo que recibe un modelo real)
          </summary>
          <pre className="bg-background/60 text-foreground mt-3 max-h-96 overflow-auto rounded p-3 font-mono text-xs whitespace-pre-wrap">
            {preview}
          </pre>
        </details>
      </Card>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0 text-sm", className)}>
      <span className="text-muted mb-1 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="text-foreground flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      className={inputClass}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
      }}
    />
  );
}

/** Lista editable como texto; se confirma al salir del campo para permitir escribir líneas nuevas. */
function LinesField({
  label,
  lines,
  onCommit,
}: {
  label: string;
  lines: readonly string[];
  onCommit: (lines: string[]) => void;
}) {
  const [text, setText] = useState(lines.join("\n"));
  return (
    <Field label={label} className="mt-3">
      <textarea
        className={cn(inputClass, "min-h-24")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() =>
          onCommit(
            text
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .slice(0, 30),
          )
        }
      />
    </Field>
  );
}

function VariablesEditor({
  variables,
  onChange,
}: {
  variables: Readonly<Record<string, string>>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [key, setKey] = useState("");
  const entries = Object.entries(variables);
  const valid = /^[a-z_][a-z0-9_]*$/i.test(key) && !(key in variables);
  return (
    <div className="mt-3 space-y-2">
      {entries.map(([name, value]) => (
        <div key={name} className="flex items-center gap-2">
          <code className="text-muted w-36 shrink-0 truncate font-mono text-xs">{`{{${name}}}`}</code>
          <input
            className={inputClass}
            aria-label={`Valor de ${name}`}
            value={value}
            maxLength={500}
            onChange={(e) => onChange({ ...variables, [name]: e.target.value })}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Quitar ${name}`}
            onClick={() => {
              const { [name]: _removed, ...rest } = variables;
              onChange(rest);
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="nueva_variable"
          aria-label="Nombre de la nueva variable"
          value={key}
          maxLength={40}
          onChange={(e) => setKey(e.target.value)}
        />
        <Button
          variant="secondary"
          disabled={!valid}
          onClick={() => {
            onChange({ ...variables, [key]: "" });
            setKey("");
          }}
        >
          <Plus aria-hidden /> Agregar
        </Button>
      </div>
    </div>
  );
}
