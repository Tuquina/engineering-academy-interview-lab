import type { RemoteModelId } from "./agent-config";
import type { TokenUsage } from "./evaluation";

/**
 * Precios de lista de referencia, en USD por millón de tokens (entrada / salida), tomados de la documentación de
 * Anthropic en noviembre de 2026. Cambian con el tiempo: verificá la página oficial de precios antes de usarlos para
 * decidir. No incluyen descuentos por caché ni por batch.
 */
export const MODEL_PRICING: Record<
  RemoteModelId,
  { readonly input: number; readonly output: number; readonly note?: string }
> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, note: "precio para prompts de hasta 100K tokens" },
};

export const PRICING_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";

/** Costo estimado en USD; `null` si no hay datos reales de tokens o el modelo no tiene precio cargado. */
export function estimateCostUsd(usage: TokenUsage | null, model: string | null): number | null {
  if (!usage || !model || !(model in MODEL_PRICING)) return null;
  const price = MODEL_PRICING[model as RemoteModelId];
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
}
