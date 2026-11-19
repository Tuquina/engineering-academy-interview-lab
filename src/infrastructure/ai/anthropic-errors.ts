import Anthropic from "@anthropic-ai/sdk";

/** Clasifica errores del SDK de Anthropic: mensaje para mostrar y si conviene reintentar (red, 429, 5xx). */
export function describeAnthropicError(cause: unknown): { message: string; retryable: boolean } {
  if (cause instanceof Anthropic.APIConnectionError)
    return { message: "Sin conexión con el proveedor.", retryable: true };
  if (cause instanceof Anthropic.RateLimitError)
    return { message: "El proveedor limitó la tasa (429).", retryable: true };
  if (cause instanceof Anthropic.InternalServerError) {
    return { message: `Error del proveedor (${cause.status}).`, retryable: true };
  }
  if (cause instanceof Anthropic.APIError) {
    return {
      message: `El proveedor rechazó la solicitud (${cause.status ?? "?"}): ${cause.message}`,
      retryable: false,
    };
  }
  return { message: cause instanceof Error ? cause.message : String(cause), retryable: false };
}
