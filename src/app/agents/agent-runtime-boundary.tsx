"use client";

import { useMemo, type ReactNode } from "react";
import { createAgentRuntime } from "@/infrastructure/composition/agent-runtime";
import { AgentRuntimeProvider } from "@/modules/agent-lab/presentation/agent-lab-context";
import { useAiStatus } from "@/shared/lib/ai-status";

/**
 * Proveedores de modelo del AI Agents Lab. Vive en el layout de `/agents` y no en los proveedores globales: el
 * proveedor local (reglas, mundo de cobranzas, herramientas) sólo se descarga cuando se abre el laboratorio.
 */
export function AgentRuntimeBoundary({ children }: { children: ReactNode }) {
  const ai = useAiStatus();
  const runtime = useMemo(() => createAgentRuntime(ai), [ai]);
  return <AgentRuntimeProvider runtime={runtime}>{children}</AgentRuntimeProvider>;
}
