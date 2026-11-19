import { z } from "zod";
import { TOOL_NAMES } from "../domain/agent-config";

/**
 * Formato de las solicitudes navegador → servidor para el proveedor real. El servidor no confía en el navegador:
 * valida tamaños y, en lugar de aceptar esquemas de herramientas arbitrarios, recibe sólo los nombres y arma las
 * definiciones él mismo.
 */

const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().max(8_000) }),
  z.object({
    type: z.literal("tool_use"),
    id: z.string().max(100),
    name: z.string().max(64),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("tool_result"),
    toolUseId: z.string().max(100),
    content: z.string().max(20_000),
    isError: z.boolean(),
  }),
]);

export const generateWireSchema = z.object({
  system: z.string().min(1).max(20_000),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.array(block).max(16),
        providerContent: z.array(z.record(z.string(), z.unknown())).max(32).optional(),
      }),
    )
    .min(1)
    .max(60),
  toolNames: z.array(z.enum(TOOL_NAMES)).max(TOOL_NAMES.length),
  model: z.string().max(64),
  maxTokens: z.number().int().min(1).max(4_096),
});

export type GenerateWire = z.infer<typeof generateWireSchema>;

export const judgeWireSchema = z.object({
  rubric: z.string().min(5).max(500),
  transcript: z.string().min(1).max(20_000),
});
