"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Estado del proveedor LLM real, informado por el servidor en tiempo de ejecución. Nunca contiene credenciales:
 * sólo si existe y qué modelo usa. Sin proveedor, las funciones que lo necesitan se muestran deshabilitadas.
 */
export interface AiStatus {
  readonly enabled: boolean;
  readonly model: string | null;
}

export const AI_DISABLED: AiStatus = { enabled: false, model: null };

const AiStatusContext = createContext<AiStatus>(AI_DISABLED);

export function AiStatusProvider({ status, children }: { status: AiStatus; children: ReactNode }) {
  return <AiStatusContext.Provider value={status}>{children}</AiStatusContext.Provider>;
}

export function useAiStatus(): AiStatus {
  return useContext(AiStatusContext);
}
