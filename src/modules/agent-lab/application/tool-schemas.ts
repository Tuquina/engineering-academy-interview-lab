import { z } from "zod";
import { TOOL_NAMES, type ToolName } from "../domain/agent-config";
import type { ToolArgs } from "../domain/tools";

/**
 * Contratos de las herramientas: descripción para el modelo y esquema de argumentos.
 *
 * El mismo esquema Zod sirve para dos cosas: generar el JSON Schema que recibe el proveedor y **validar** lo que el
 * modelo envía antes de ejecutar nada. Un LLM puede producir argumentos con tipos o campos incorrectos; nunca se
 * confía en ellos sin validar.
 */

const customerId = z
  .string()
  .min(1)
  .max(20)
  .describe("Id del cliente de la conversación, por ejemplo c-001.");

const SCHEMAS = {
  get_debt: z.strictObject({ customerId }),
  get_history: z.strictObject({
    customerId,
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Cantidad máxima de eventos (por defecto 10)."),
  }),
  register_payment_promise: z.strictObject({
    customerId,
    amountCents: z.number().int().positive().describe("Monto prometido en centavos."),
    promisedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
      .describe("Fecha prometida, AAAA-MM-DD."),
  }),
  get_allowed_offers: z.strictObject({ customerId }),
  confirm_payment: z.strictObject({
    customerId,
    reference: z
      .string()
      .min(3)
      .max(40)
      .describe("Referencia del pago informada por el cliente (ej. TRX-88123)."),
  }),
  schedule_contact: z.strictObject({
    customerId,
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
      .describe("Día del contacto, AAAA-MM-DD."),
    hour: z.number().int().min(0).max(23).describe("Hora local del contacto (0 a 23)."),
    channel: z.enum(["call", "whatsapp", "sms"]),
    reason: z.string().min(3).max(200),
  }),
  register_refusal: z.strictObject({
    customerId,
    reason: z.enum(["cannot_pay", "does_not_recognize_debt", "will_not_pay", "do_not_contact"]),
    notes: z.string().max(500).optional(),
  }),
  escalate_to_operator: z.strictObject({
    customerId,
    reason: z.string().min(3).max(200),
    priority: z.enum(["normal", "high"]),
    summary: z
      .string()
      .min(3)
      .max(1000)
      .describe("Resumen para el operador: qué pasó y qué pidió la persona."),
  }),
} satisfies { [N in ToolName]: z.ZodType<ToolArgs[N]> };

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  get_debt:
    "Devuelve la deuda vencida, las cuotas atrasadas, los días de atraso y si hay una promesa activa.",
  get_history:
    "Devuelve los últimos eventos del cliente: pagos, promesas, contactos, rechazos y escalamientos.",
  register_payment_promise:
    "Registra una promesa de pago. Debe cubrir la deuda vencida y respetar el plazo máximo de la política.",
  get_allowed_offers:
    "Devuelve las únicas propuestas que el agente puede ofrecer (pago total, plan en cuotas, descuento).",
  confirm_payment: "Busca un pago por referencia y, si está pendiente, lo aplica a las cuotas.",
  schedule_contact: "Programa un contacto futuro dentro de la ventana horaria permitida.",
  register_refusal: "Registra que la persona rechaza pagar o pide no ser contactada.",
  escalate_to_operator: "Deriva la conversación a un operador humano con un resumen.",
};

export interface ToolDefinition {
  readonly name: ToolName;
  readonly description: string;
  /** JSON Schema de los argumentos (objeto, sin propiedades adicionales). */
  readonly inputSchema: Record<string, unknown>;
}

const DEFINITIONS: Record<ToolName, ToolDefinition> = Object.fromEntries(
  TOOL_NAMES.map((name) => {
    const { $schema: _ignored, ...inputSchema } = z.toJSONSchema(SCHEMAS[name]) as Record<string, unknown>;
    return [name, { name, description: TOOL_DESCRIPTIONS[name], inputSchema }];
  }),
) as Record<ToolName, ToolDefinition>;

export function toolDefinitions(names: readonly ToolName[]): ToolDefinition[] {
  return names.map((name) => DEFINITIONS[name]);
}

export type ArgsValidation<N extends ToolName> =
  { readonly ok: true; readonly data: ToolArgs[N] } | { readonly ok: false; readonly issues: string[] };

export function validateToolArgs<N extends ToolName>(name: N, input: unknown): ArgsValidation<N> {
  const result = (SCHEMAS[name] as unknown as z.ZodType<ToolArgs[N]>).safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => `${issue.path.join(".") || "(raíz)"}: ${issue.message}`),
  };
}

/** Argumentos de ejemplo para el Tool Calling Simulator. */
export function exampleArgs(name: ToolName, customer: string, today: string): Record<string, unknown> {
  switch (name) {
    case "get_debt":
    case "get_allowed_offers":
      return { customerId: customer };
    case "get_history":
      return { customerId: customer, limit: 5 };
    case "register_payment_promise":
      return { customerId: customer, amountCents: 4_500_000, promisedDate: today };
    case "confirm_payment":
      return { customerId: customer, reference: "TRX-88123" };
    case "schedule_contact":
      return {
        customerId: customer,
        date: today,
        hour: 10,
        channel: "call",
        reason: "Recordatorio acordado",
      };
    case "register_refusal":
      return { customerId: customer, reason: "cannot_pay", notes: "Perdió el trabajo" };
    case "escalate_to_operator":
      return {
        customerId: customer,
        reason: "Pide hablar con una persona",
        priority: "normal",
        summary: "...",
      };
  }
}
