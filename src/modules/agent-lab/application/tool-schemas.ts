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
  get_order: z.strictObject({ customerId }),
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
  schedule_return: z.strictObject({
    customerId,
    orderId: z.string().min(3).max(20).describe("Id del pedido a devolver, por ejemplo O-1002."),
    pickupDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
      .describe("Día en que el transportista retira el paquete, AAAA-MM-DD."),
  }),
  get_allowed_compensations: z.strictObject({ customerId }),
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
  register_complaint: z.strictObject({
    customerId,
    reason: z.enum(["late_delivery", "damaged_item", "unrecognized_charge", "do_not_contact"]),
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
  get_order:
    "Devuelve el pedido más reciente del cliente: estado, transportista, fecha comprometida, días de demora, plazo de devolución y pagos en proceso.",
  get_history:
    "Devuelve los últimos eventos del cliente: envíos, pagos, devoluciones, contactos, reclamos y escalamientos.",
  schedule_return:
    "Programa la devolución de un pedido entregado con retiro a domicilio. Respeta el plazo de devolución y el plazo máximo para el retiro.",
  get_allowed_compensations:
    "Devuelve las únicas compensaciones que el agente puede ofrecer (cupón, reintegro del envío, cancelación con reembolso, devolución).",
  confirm_payment: "Busca un pago por referencia y, si está pendiente, lo aplica al pedido.",
  schedule_contact: "Programa un contacto futuro dentro de la ventana horaria permitida.",
  register_complaint:
    "Registra un reclamo (demora, producto dañado, cargo no reconocido) o el pedido de no ser contactado.",
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
    case "get_order":
    case "get_allowed_compensations":
      return { customerId: customer };
    case "get_history":
      return { customerId: customer, limit: 5 };
    case "schedule_return":
      return { customerId: customer, orderId: "O-1002", pickupDate: today };
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
    case "register_complaint":
      return {
        customerId: customer,
        reason: "late_delivery",
        notes: "El pedido no llegó en la fecha prometida",
      };
    case "escalate_to_operator":
      return {
        customerId: customer,
        reason: "Pide hablar con una persona",
        priority: "normal",
        summary: "...",
      };
  }
}
