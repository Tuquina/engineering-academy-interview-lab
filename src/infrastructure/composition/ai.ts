import { isRemoteModel, type RemoteModelId } from "@/modules/agent-lab/domain/agent-config";

/**
 * Configuración del proveedor LLM real, leída sólo en el servidor.
 *
 * - `ANTHROPIC_API_KEY`: si no está, todo lo que depende de un modelo real queda deshabilitado y la plataforma sigue
 *   funcionando con el proveedor local determinista.
 * - `AI_MODEL`: modelo por defecto (uno de los permitidos).
 */
export function getAiStatus(): { enabled: boolean; model: RemoteModelId | null } {
  const enabled = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  return { enabled, model: enabled ? defaultModel() : null };
}

export function defaultModel(): RemoteModelId {
  const configured = process.env.AI_MODEL?.trim() ?? "";
  return isRemoteModel(configured) ? configured : "claude-opus-5-5";
}
