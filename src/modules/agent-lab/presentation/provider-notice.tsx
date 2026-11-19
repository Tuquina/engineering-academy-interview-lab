"use client";

import { Cpu, Info, Sparkles } from "lucide-react";
import type { LlmProvider } from "../application/llm-provider";
import { useAgentRuntime } from "./agent-lab-context";

/** Aviso permanente de qué proveedor responde: nunca se presenta una simulación como un modelo real. */
export function ProviderNotice({ provider }: { provider: LlmProvider }) {
  const runtime = useAgentRuntime();
  if (provider.kind === "simulated") {
    return (
      <p
        className="border-warning/40 bg-warning/10 text-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
        data-testid="provider-notice"
      >
        <Cpu aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
        <span>
          <strong>Proveedor local determinista (simulación, no es un LLM).</strong> Interpreta los mensajes
          con reglas y usa la configuración estructurada del agente (herramientas, políticas, memoria, tono);
          no lee el system prompt.
          {runtime.remote
            ? " Elegí el proveedor real en la configuración del modelo para usar un LLM."
            : " Para usar un modelo real, configurá ANTHROPIC_API_KEY en el servidor (ver README)."}
        </span>
      </p>
    );
  }
  return (
    <p
      className="border-accent/40 bg-accent/10 text-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
      data-testid="provider-notice"
    >
      <Sparkles aria-hidden className="text-accent mt-0.5 size-4 shrink-0" />
      <span>
        <strong>Modelo real: {runtime.remoteModel}.</strong> Cada mensaje consume tokens de tu cuenta; las
        respuestas varían entre ejecuciones.
      </span>
    </p>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted flex items-start gap-2 text-xs">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
