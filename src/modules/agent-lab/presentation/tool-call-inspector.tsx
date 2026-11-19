"use client";

import { AlertTriangle, CheckCircle2, ShieldX, XCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { TOOL_LABELS, type ToolName } from "../domain/agent-config";
import type { ToolCallTrace } from "../domain/conversation";

const STATUS: Record<
  ToolCallTrace["status"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  ok: { label: "OK", icon: CheckCircle2, className: "text-success" },
  invalid_args: { label: "Argumentos inválidos", icon: XCircle, className: "text-danger" },
  business_error: { label: "Regla de negocio", icon: AlertTriangle, className: "text-warning" },
  not_allowed: { label: "No habilitada", icon: ShieldX, className: "text-danger" },
};

/**
 * Detalle de una llamada a herramienta: argumentos enviados, validación del esquema, resultado o error, estado
 * anterior y posterior del cliente, cambios y tiempo de ejecución (MASTER_PROMPT §16.4).
 */
export function ToolCallInspector({
  trace,
  defaultOpen = false,
}: {
  trace: ToolCallTrace;
  defaultOpen?: boolean;
}) {
  const [showState, setShowState] = useState(false);
  const status = STATUS[trace.status];
  const Icon = status.icon;
  return (
    <details open={defaultOpen} className="border-border bg-surface-2/40 rounded-md border text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2">
        <Icon aria-hidden className={cn("size-4", status.className)} />
        <code className="text-foreground font-mono text-xs">{trace.name}</code>
        <span className="text-muted text-xs">
          {TOOL_LABELS[trace.name as ToolName] ?? "herramienta desconocida"}
        </span>
        <Badge tone={trace.status === "ok" ? "success" : "warning"}>{status.label}</Badge>
        <span className="text-muted ml-auto text-xs tabular-nums">{trace.durationMs.toFixed(2)} ms</span>
      </summary>
      <div className="border-border space-y-3 border-t px-3 py-3">
        <Section title="Argumentos enviados">
          <Json value={trace.input} />
        </Section>
        <Section title="Validación del esquema">
          {trace.status === "not_allowed" ? (
            <p className="text-muted text-xs">
              No se validó: la herramienta no está habilitada para este agente.
            </p>
          ) : trace.validationIssues.length ? (
            <ul className="text-danger list-disc space-y-0.5 pl-5 text-xs">
              {trace.validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="text-success text-xs">Los argumentos cumplen el esquema.</p>
          )}
        </Section>
        {trace.error ? (
          <Section title="Error">
            <p className="text-warning text-xs">{trace.error}</p>
          </Section>
        ) : null}
        {trace.result && trace.status === "ok" ? (
          <Section title="Resultado">
            <Json value={trace.result} />
          </Section>
        ) : null}
        <Section title="Cambios en el estado">
          {trace.changes.length ? (
            <ul className="text-foreground list-disc space-y-0.5 pl-5 font-mono text-xs">
              {trace.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-xs">Sin cambios (lectura o llamada rechazada).</p>
          )}
        </Section>
        <button
          type="button"
          className="text-accent text-xs font-medium hover:underline"
          onClick={() => setShowState((v) => !v)}
          aria-expanded={showState}
        >
          {showState ? "Ocultar" : "Ver"} estado anterior y posterior del cliente
        </button>
        {showState ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Section title="Antes">
              <Json value={trace.before} />
            </Section>
            <Section title="Después">
              <Json value={trace.after} />
            </Section>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h4 className="text-muted mb-1 text-[11px] font-semibold tracking-wide uppercase">{title}</h4>
      {children}
    </div>
  );
}

export function Json({ value }: { value: unknown }) {
  return (
    <pre className="bg-background/60 text-foreground max-h-72 overflow-auto rounded p-2 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
