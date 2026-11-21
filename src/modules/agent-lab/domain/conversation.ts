import type { ToolName } from "./agent-config";
import type { CustomerSnapshot } from "./support-world";

/**
 * Formato de conversación independiente del proveedor.
 *
 * Sigue la forma común a las APIs de LLM con tool calling: el asistente emite bloques `tool_use` y la aplicación
 * responde con bloques `tool_result` en el siguiente mensaje de usuario. Un adaptador traduce este formato al de cada
 * proveedor.
 */

export type ContentBlock =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "tool_use"; readonly id: string; readonly name: string; readonly input: unknown }
  | {
      readonly type: "tool_result";
      readonly toolUseId: string;
      readonly content: string;
      readonly isError: boolean;
    };

export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: readonly ContentBlock[];
  /**
   * Contenido original del proveedor (por ejemplo, bloques de razonamiento firmados). Se reenvía sin modificar en
   * los siguientes pasos porque algunas APIs lo exigen; el proveedor local no lo usa.
   */
  readonly providerContent?: unknown;
}

export function textOf(message: ChatMessage): string {
  return message.content
    .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export function userText(text: string): ChatMessage {
  return { role: "user", content: [{ type: "text", text }] };
}

/** Traza de una llamada a herramienta: lo que se muestra en el Tool Calling Simulator y en el playground. */
export interface ToolCallTrace {
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
  readonly status: "ok" | "invalid_args" | "business_error" | "not_allowed";
  /** Problemas de validación del esquema de argumentos (vacío si los argumentos son válidos). */
  readonly validationIssues: readonly string[];
  readonly result: Record<string, unknown> | null;
  readonly error: string | null;
  readonly before: CustomerSnapshot;
  readonly after: CustomerSnapshot;
  readonly changes: readonly string[];
  /** Tiempo de ejecución local medido (no incluye red: las herramientas son simuladas). */
  readonly durationMs: number;
}

export function isKnownTool(name: string, tools: readonly ToolName[]): name is ToolName {
  return (tools as readonly string[]).includes(name);
}
