import {
  ProviderError,
  type GenerateRequest,
  type GenerateResponse,
  type LlmProvider,
} from "../application/llm-provider";
import type { AgentConfig, Tone, ToolName } from "../domain/agent-config";
import type { ChatMessage, ContentBlock } from "../domain/conversation";
import type { MemoryFact } from "../domain/memory";
import { createRng, hashString } from "../domain/random";
import { addDays, formatDate, type IsoDate } from "../domain/support-world";
import { parseMessage, type Intent, type ParsedMessage } from "./local-intents";

/**
 * Proveedor local determinista (MASTER_PROMPT §16.3): permite practicar sin API key.
 *
 * **No es un LLM.** Interpreta el mensaje con reglas (`local-intents`), arma un plan de herramientas según la
 * configuración estructurada del agente (herramientas habilitadas, políticas, memoria, tono) y redacta la respuesta
 * con plantillas. No lee el system prompt en lenguaje natural.
 *
 * Para practicar evaluaciones repetidas, `model.variability` introduce, con una semilla, variaciones de redacción y
 * errores típicos de un agente real: responder sin consultar herramientas, omitir la presentación como asistente
 * virtual, usar frases prohibidas o intentar consultar datos de otra persona. Misma semilla, mismo resultado.
 */
export class LocalDeterministicProvider implements LlmProvider {
  readonly id = "local-deterministic";
  readonly kind = "simulated" as const;

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return localGenerate(request);
  }
}

type ErrorMode = "none" | "skip_tools" | "no_disclosure" | "pressure" | "unsafe_tool";

interface DoneCall {
  readonly name: string;
  readonly ok: boolean;
  readonly data: Record<string, unknown>;
}

interface PlannedCall {
  readonly name: ToolName;
  readonly input: (done: readonly DoneCall[]) => Record<string, unknown>;
}

interface TurnState {
  readonly config: AgentConfig;
  readonly customerId: string;
  readonly today: IsoDate;
  readonly memory: readonly MemoryFact[];
  readonly parsed: ParsedMessage;
  readonly firstContact: boolean;
  readonly allowed: ReadonlySet<string>;
  readonly errorMode: ErrorMode;
  /** Resultado de get_order disponible antes de este turno (dentro de la ventana de contexto). */
  readonly knownOrder: Record<string, unknown> | null;
  readonly rng: () => number;
}

const READ_ONLY: ReadonlySet<string> = new Set(["get_order", "get_history", "get_allowed_compensations"]);

export function localGenerate(request: GenerateRequest): GenerateResponse {
  if (!request.context)
    throw new ProviderError("El proveedor local necesita el contexto estructurado del agente.", false);
  const { config, customerId, today, memory, seed } = request.context;
  const messages = request.messages;
  const turnStart = findLastIndex(
    messages,
    (m) => m.role === "user" && m.content.some((b) => b.type === "text"),
  );
  const currentText = turnStart >= 0 ? textOf(messages[turnStart]!) : "";
  const parsed = parseMessage(currentText, today, customerId);
  const firstContact = !messages.slice(0, Math.max(0, turnStart)).some((m) => m.role === "assistant");
  const allowed = new Set(request.tools.map((t) => t.name));
  const decisionRng = createRng(hashString(`${seed}|${turnStart}|${currentText}`));
  const errorMode = pickErrorMode(decisionRng, config, parsed.intent, firstContact);

  const state: TurnState = {
    config,
    customerId,
    today,
    memory,
    parsed,
    firstContact,
    allowed,
    errorMode,
    knownOrder: lastResult(messages.slice(0, Math.max(0, turnStart)), "get_order"),
    rng: createRng(hashString(`${seed}|phrases|${turnStart}`)),
  };

  const done = callsInTurn(messages.slice(turnStart + 1));
  const plan = planCalls(state);
  const failedWrite = done.some((d) => !d.ok && !READ_ONLY.has(d.name));
  const next = !failedWrite ? plan.calls[done.length] : undefined;
  if (next) {
    const id = `toolu_local_${(seed >>> 0).toString(36)}_${turnStart}_${done.length}`;
    return {
      content: [{ type: "tool_use", id, name: next.name, input: next.input(done) }],
      stopReason: "tool_use",
      usage: null,
    };
  }
  return {
    content: [{ type: "text", text: compose(state, done, plan.unavailable) }],
    stopReason: "end_turn",
    usage: null,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Decisión de errores simulados
// ---------------------------------------------------------------------------------------------------------------

const SKIPPABLE: ReadonlySet<Intent> = new Set(["order", "return", "greeting", "late", "compensation"]);
const PRESSURABLE: ReadonlySet<Intent> = new Set(["order", "return", "late", "greeting"]);

function pickErrorMode(
  rng: () => number,
  config: AgentConfig,
  intent: Intent,
  firstContact: boolean,
): ErrorMode {
  const p = config.model.variability * 0.4;
  if (p <= 0 || rng() >= p) return "none";
  const candidates: ErrorMode[] = [];
  if (SKIPPABLE.has(intent)) candidates.push("skip_tools");
  if (PRESSURABLE.has(intent)) candidates.push("pressure");
  if (firstContact && config.policies.discloseAiIdentity) candidates.push("no_disclosure");
  if (intent === "other_customer") candidates.push("unsafe_tool");
  if (candidates.length === 0) return "none";
  return candidates[Math.floor(rng() * candidates.length)]!;
}

// ---------------------------------------------------------------------------------------------------------------
// Plan de herramientas
// ---------------------------------------------------------------------------------------------------------------

function planCalls(state: TurnState): { calls: PlannedCall[]; unavailable: ToolName[] } {
  const { parsed, customerId, today, config, errorMode } = state;
  const c = { customerId };
  const wanted: PlannedCall[] = [];
  const add = (name: ToolName, input: PlannedCall["input"] = () => c) => wanted.push({ name, input });

  switch (parsed.intent) {
    case "other_customer":
      if (errorMode === "unsafe_tool")
        add("get_order", () => ({ customerId: parsed.mentionedCustomerId ?? "c-999" }));
      break;
    case "dispute":
      if (config.policies.escalateOnDispute) {
        add("register_complaint", () => ({
          ...c,
          reason: "unrecognized_charge",
          notes: "No reconoce la compra",
        }));
        add("escalate_to_operator", () => ({
          ...c,
          reason: "No reconoce un cargo",
          priority: "high",
          summary: `La persona dice: "${truncate(parsed.normalized, 200)}". No se operó sobre el pedido.`,
        }));
      } else {
        add("get_order");
      }
      break;
    case "human":
      add("escalate_to_operator", () => ({
        ...c,
        reason: "Pide hablar con una persona",
        priority: "normal",
        summary: `Pedido de la persona: "${truncate(parsed.normalized, 200)}".`,
      }));
      break;
    case "do_not_contact":
      add("register_complaint", () => ({ ...c, reason: "do_not_contact", notes: "Pide no ser contactada" }));
      break;
    case "paid":
      if (parsed.reference) add("confirm_payment", () => ({ ...c, reference: parsed.reference }));
      break;
    case "return":
      if (!state.knownOrder) add("get_order");
      if (parsed.date) {
        add("schedule_return", (done) => {
          const order = done.find((d) => d.name === "get_order" && d.ok)?.data ?? state.knownOrder ?? {};
          const orderId = parsed.orderId ?? (typeof order.orderId === "string" ? order.orderId : "");
          return { ...c, orderId, pickupDate: parsed.date };
        });
      }
      break;
    case "late":
      if (state.allowed.has("get_allowed_compensations")) add("get_allowed_compensations");
      else
        add("register_complaint", () => ({
          ...c,
          reason: "late_delivery",
          notes: truncate(parsed.normalized, 200),
        }));
      break;
    case "compensation":
      add("get_allowed_compensations");
      break;
    case "schedule":
      add("schedule_contact", () => ({
        ...c,
        date: parsed.date ?? addDays(today, 1),
        hour: parsed.hour ?? preferredHour(state.memory) ?? 10,
        channel: parsed.channel,
        reason: "La persona pidió que la contacten más adelante",
      }));
      break;
    case "history":
      add("get_history", () => ({ ...c, limit: 5 }));
      break;
    case "order":
      add("get_order");
      break;
    case "greeting":
    case "unknown":
      if (state.firstContact) add("get_order");
      break;
    case "injection":
      break;
  }

  if (errorMode === "skip_tools") return { calls: [], unavailable: [] };
  return {
    calls: wanted.filter((w) => state.allowed.has(w.name)),
    unavailable: wanted.filter((w) => !state.allowed.has(w.name)).map((w) => w.name),
  };
}

function preferredHour(memory: readonly MemoryFact[]): number | null {
  const fact = memory.find((f) => f.topic === "contact_time");
  if (!fact) return null;
  if (/tarde/.test(fact.text)) return 16;
  if (/noche/.test(fact.text)) return 19;
  return 10;
}

// ---------------------------------------------------------------------------------------------------------------
// Redacción
// ---------------------------------------------------------------------------------------------------------------

function compose(state: TurnState, done: readonly DoneCall[], unavailable: readonly ToolName[]): string {
  const { config, parsed, errorMode } = state;
  const tone = config.identity.tone;
  const r = (vos: string, usted: string) => (tone === "friendly" ? vos : usted);
  const pick = (options: readonly string[]) =>
    config.model.variability === 0 ? options[0]! : options[Math.floor(state.rng() * options.length)]!;
  const result = (name: string) => done.find((d) => d.name === name);
  const parts: string[] = [];

  if (state.firstContact) parts.push(opening(state, pick));

  const orderText = (data: Record<string, unknown>, followUp: boolean) => {
    if (data.order === null)
      return r("No encuentro pedidos a tu nombre.", "No encuentro pedidos a su nombre.");
    const id = String(data.orderId);
    const what = `${r("Tu", "Su")} pedido ${id} (${String(data.description)})`;
    const lines: string[] = [];
    switch (data.status) {
      case "shipped":
        lines.push(
          Number(data.daysLate) > 0
            ? `${what} está en camino con ${String(data.carrier)}, demorado ${String(data.daysLate)} día(s): la entrega estaba prevista para el ${formatDate(String(data.promisedBy))}.`
            : `${what} está en camino con ${String(data.carrier)} y llega a más tardar el ${formatDate(String(data.promisedBy))}.`,
        );
        break;
      case "delivered":
        lines.push(
          `${what} fue entregado el ${formatDate(String(data.deliveredAt))}.`,
          data.returnDeadline
            ? r(
                `Si necesitás devolverlo, tenés tiempo hasta el ${formatDate(String(data.returnDeadline))}.`,
                `Si necesita devolverlo, tiene tiempo hasta el ${formatDate(String(data.returnDeadline))}.`,
              )
            : "",
        );
        break;
      case "pending_payment":
        lines.push(`${what} está pendiente de pago.`);
        if (typeof data.pendingPaymentsCents === "number" && data.pendingPaymentsCents > 0) {
          lines.push("Veo un pago informado que todavía se está procesando.");
        }
        break;
      default:
        lines.push(
          `${what} ya está pagado y estamos preparando el envío; llega a más tardar el ${formatDate(String(data.promisedBy))}.`,
        );
    }
    const pending = data.activeReturn as { pickupDate: string } | null;
    if (pending)
      lines.push(`Ya hay una devolución programada con retiro el ${formatDate(pending.pickupDate)}.`);
    const claim = state.memory.find((f) => f.topic === "payment_claim");
    const processing = typeof data.pendingPaymentsCents === "number" && data.pendingPaymentsCents > 0;
    if (claim && data.status === "pending_payment" && !processing) {
      lines.push(
        r(
          "La última vez me dijiste que ya habías pagado, pero no lo veo registrado. ¿Me pasás la referencia del pago?",
          "La última vez nos indicó que ya había pagado, pero no lo vemos registrado. ¿Nos indica la referencia?",
        ),
      );
    } else if (followUp) {
      lines.push(
        pick([
          r("¿Te ayudo con algo más?", "¿Lo ayudo con algo más?"),
          r("¿Necesitás algo más sobre este pedido?", "¿Necesita algo más sobre este pedido?"),
        ]),
      );
    }
    return lines.filter(Boolean).join(" ");
  };

  const unavailableText = (tool: ToolName) =>
    r(
      `Por este canal no puedo ${UNAVAILABLE_ACTION[tool]}; si querés, te derivo con una persona del equipo.`,
      `Por este canal no puedo ${UNAVAILABLE_ACTION[tool]}; si lo desea, lo derivo con una persona del equipo.`,
    );

  switch (parsed.intent) {
    case "injection":
      parts.push(
        r(
          "No puedo cambiar mis instrucciones ni compartir mi configuración. Sí puedo ayudarte con tu pedido: ¿querés que te diga en qué estado está?",
          "No puedo modificar mis instrucciones ni compartir mi configuración. Sí puedo ayudarlo con su pedido: ¿desea conocer su estado?",
        ),
      );
      break;
    case "other_customer":
      parts.push(
        r(
          "No puedo darte información de otra persona: sólo puedo hablar de tu propia cuenta.",
          "No puedo brindarle información de otra persona: sólo puedo referirme a su propia cuenta.",
        ),
      );
      break;
    case "dispute": {
      const escalated = result("escalate_to_operator");
      if (escalated?.ok) {
        parts.push(
          r(
            "Entiendo que no reconocés esta compra. No voy a hacer ningún cambio en el pedido: derivé tu caso a un operador que lo va a revisar con prioridad.",
            "Entiendo que no reconoce esta compra. No haremos cambios en el pedido: derivé su caso a un operador que lo revisará con prioridad.",
          ),
        );
      } else if (result("get_order")?.ok) {
        parts.push(`Según nuestros registros: ${orderText(result("get_order")!.data, false)}`);
      } else {
        parts.push(unavailableText("escalate_to_operator"));
      }
      break;
    }
    case "human": {
      const escalated = result("escalate_to_operator");
      if (escalated?.ok) {
        parts.push(
          r(
            "Te derivo con una persona del equipo. Ya le pasé un resumen para que no tengas que repetir todo.",
            "Lo derivo con una persona del equipo. Ya le envié un resumen para que no tenga que repetir la información.",
          ),
        );
      } else if (escalated) {
        parts.push(`No pude derivarte: ${String(escalated.data.error ?? "error desconocido")}`);
      } else {
        parts.push(unavailableText("escalate_to_operator"));
      }
      break;
    }
    case "do_not_contact": {
      const complaint = result("register_complaint");
      parts.push(
        complaint?.ok
          ? r(
              "Entendido: registré que no querés que te contactemos y no vamos a volver a escribirte por este motivo.",
              "Entendido: registré su pedido de no ser contactado y no volveremos a escribirle por este motivo.",
            )
          : unavailableText("register_complaint"),
      );
      break;
    }
    case "paid": {
      const confirm = result("confirm_payment");
      if (!parsed.reference) {
        parts.push(
          r(
            "¡Gracias! ¿Me pasás la referencia o número de operación del pago (por ejemplo, TRX-12345) así lo verifico?",
            "Gracias. ¿Podría indicarme la referencia o número de operación del pago (por ejemplo, TRX-12345) para verificarlo?",
          ),
        );
      } else if (!confirm) {
        parts.push(unavailableText("confirm_payment"));
      } else if (!confirm.ok) {
        parts.push(`No pude verificar el pago: ${String(confirm.data.error)}`);
      } else if (confirm.data.found === false) {
        parts.push(
          `No encuentro un pago con la referencia ${parsed.reference}. ${r("¿Podés revisarla?", "¿Podría revisarla?")} A veces un pago tarda hasta 48 h en informarse.`,
        );
      } else if (confirm.data.alreadyApplied) {
        parts.push(`Ese pago (${String(confirm.data.amount)}) ya estaba acreditado.`);
      } else {
        parts.push(
          `Encontré el pago ${parsed.reference} por ${String(confirm.data.amount)} y ya quedó acreditado en el pedido ${String(confirm.data.orderId)}: ahora estamos preparando el envío.`,
        );
      }
      break;
    }
    case "return": {
      const scheduled = result("schedule_return");
      const order = result("get_order");
      if (errorMode === "skip_tools") {
        parts.push(r("Perfecto, lo dejo anotado. ¡Gracias!", "Perfecto, queda anotado. Gracias."));
      } else if (!parsed.date) {
        if (order?.ok) parts.push(orderText(order.data, false));
        parts.push(
          r(
            `¿Qué día querés que pase el transportista a retirarlo? Puedo programar el retiro hasta el ${formatDate(addDays(state.today, config.policies.maxPickupDays))}.`,
            `¿Qué día prefiere que pase el transportista a retirarlo? Puedo programar el retiro hasta el ${formatDate(addDays(state.today, config.policies.maxPickupDays))}.`,
          ),
        );
      } else if (!scheduled) {
        parts.push(unavailableText("schedule_return"));
      } else if (scheduled.ok) {
        parts.push(
          pick([
            `Listo, programé la devolución del pedido ${String(scheduled.data.orderId)}: el transportista pasa a retirarlo el ${formatDate(String(scheduled.data.pickupDate))}.`,
            `Perfecto: queda programada la devolución del pedido ${String(scheduled.data.orderId)} con retiro el ${formatDate(String(scheduled.data.pickupDate))}.`,
          ]),
          r(
            `Cuando recibamos el paquete te reintegramos ${String(scheduled.data.refund)}.`,
            `Cuando recibamos el paquete le reintegraremos ${String(scheduled.data.refund)}.`,
          ),
        );
      } else {
        parts.push(
          `No pude programar la devolución: ${String(scheduled.data.error)}`,
          r(
            "¿Te sirve otra fecha dentro de ese plazo?",
            "¿Le resulta posible otra fecha dentro de ese plazo?",
          ),
        );
      }
      break;
    }
    case "late":
    case "compensation": {
      const offers = result("get_allowed_compensations");
      if (parsed.intent === "late") {
        parts.push(
          r(
            "Lamento mucho la demora, entiendo que es una molestia.",
            "Lamento mucho la demora, entiendo que es una molestia.",
          ),
        );
      }
      if (errorMode === "skip_tools") {
        parts.push(
          r(
            "Te puedo dar un cupón del 50 % y el envío gratis, ¿te sirve?",
            "Podemos ofrecerle un cupón del 50 % y el envío gratis, ¿le sirve?",
          ),
        );
      } else if (offers?.ok) {
        const list = (offers.data.compensations as { description: string }[] | undefined) ?? [];
        parts.push(
          list.length
            ? `${r("Esto es lo que te puedo ofrecer:", "Esto es lo que podemos ofrecerle:")} ${list
                .map((o, i) => `(${i + 1}) ${o.description}`)
                .join(" ")} ${r("¿Cuál preferís?", "¿Cuál prefiere?")}`
            : r(
                "Tu pedido no tiene demoras ni reclamos abiertos, así que no corresponde una compensación.",
                "Su pedido no tiene demoras ni reclamos abiertos, por lo que no corresponde una compensación.",
              ),
        );
      } else if (offers) {
        parts.push(`No puedo ofrecer compensaciones: ${String(offers.data.error)}`);
      } else if (result("register_complaint")?.ok) {
        parts.push(
          r(
            "Registré tu reclamo por la demora. Por este canal no puedo ofrecerte compensaciones; una persona del equipo lo va a revisar.",
            "Registré su reclamo por la demora. Por este canal no puedo ofrecerle compensaciones; una persona del equipo lo revisará.",
          ),
        );
      } else {
        parts.push(unavailableText("get_allowed_compensations"));
      }
      break;
    }
    case "schedule": {
      const contact = result("schedule_contact");
      if (contact?.ok) {
        parts.push(
          `${r("Perfecto, te contactamos", "Perfecto, lo contactaremos")} el ${String(
            contact.data.at,
          ).replace(
            /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):\d{2}$/,
            "$3/$2 a las $4 h",
          )} por ${CHANNEL_LABELS[String(contact.data.channel)] ?? "teléfono"}.`,
        );
      } else if (contact) {
        parts.push(`No puedo agendarlo así: ${String(contact.data.error)}`);
      } else {
        parts.push(unavailableText("schedule_contact"));
      }
      break;
    }
    case "history": {
      const history = result("get_history");
      const events = (history?.data.events as { at: string; description: string }[] | undefined) ?? [];
      parts.push(
        history?.ok
          ? events.length
            ? `${r("Tus", "Sus")} últimos movimientos: ${events.map((e) => `${formatDate(e.at)}: ${e.description}`).join(" ")}`
            : "No hay movimientos registrados."
          : unavailableText("get_history"),
      );
      break;
    }
    case "order":
    case "greeting":
    case "unknown": {
      const order = result("get_order");
      if (order?.ok) parts.push(orderText(order.data, true));
      else if (errorMode === "skip_tools" && parsed.intent !== "unknown") {
        parts.push(
          r(
            "Tu pedido ya está en camino y te llega en estos días.",
            "Su pedido ya está en camino y le llegará en estos días.",
          ),
        );
      } else if (parsed.intent === "order") parts.push(unavailableText("get_order"));
      else if (!state.firstContact) {
        parts.push(
          r(
            "Puedo ayudarte a ver el estado de tu pedido, programar una devolución, verificar un pago o derivarte con una persona. ¿Qué preferís?",
            "Puedo ayudarlo a ver el estado de su pedido, programar una devolución, verificar un pago o derivarlo con una persona. ¿Qué prefiere?",
          ),
        );
      }
      break;
    }
  }

  if (errorMode === "pressure" && unavailable.length === 0) {
    parts.push(
      r(
        "Igual, si el correo se demora no es nuestro problema.",
        "De todos modos, si el correo se demora no es nuestro problema.",
      ),
    );
  }
  return parts.filter(Boolean).join(" ");
}

function opening(state: TurnState, pick: (options: readonly string[]) => string): string {
  const { agentName, companyName } = state.config.identity;
  const disclose = state.config.policies.discloseAiIdentity && state.errorMode !== "no_disclosure";
  const hello = pick(greetings(state.config.identity.tone));
  return disclose
    ? `${hello}, soy ${agentName}, asistente virtual de ${companyName}.`
    : `${hello}, soy ${agentName}, de ${companyName}.`;
}

function greetings(tone: Tone): readonly string[] {
  if (tone === "friendly") return ["Hola", "Buenas"];
  if (tone === "formal") return ["Buen día", "Buenos días"];
  return ["Hola", "Buen día"];
}

const UNAVAILABLE_ACTION: Record<ToolName, string> = {
  get_order: "consultar pedidos",
  get_history: "consultar el historial",
  schedule_return: "programar devoluciones",
  get_allowed_compensations: "ofrecer compensaciones",
  confirm_payment: "verificar pagos",
  schedule_contact: "agendar contactos",
  register_complaint: "registrar reclamos",
  escalate_to_operator: "derivar con una persona",
};

const CHANNEL_LABELS: Record<string, string> = { call: "teléfono", whatsapp: "WhatsApp", sms: "SMS" };

// ---------------------------------------------------------------------------------------------------------------
// Utilidades sobre la conversación
// ---------------------------------------------------------------------------------------------------------------

function callsInTurn(messages: readonly ChatMessage[]): DoneCall[] {
  const names = new Map<string, string>();
  const done: DoneCall[] = [];
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === "tool_use") names.set(block.id, block.name);
      if (block.type === "tool_result") {
        done.push({
          name: names.get(block.toolUseId) ?? "?",
          ok: !block.isError,
          data: safeParse(block.content),
        });
      }
    }
  }
  return done;
}

function lastResult(messages: readonly ChatMessage[], tool: string): Record<string, unknown> | null {
  const calls = callsInTurn(messages).filter((c) => c.name === tool && c.ok);
  return calls.at(-1)?.data ?? null;
}

function safeParse(content: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(content);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : { value };
  } catch {
    return { raw: content };
  }
}

function textOf(message: ChatMessage): string {
  return message.content
    .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) if (predicate(items[i]!)) return i;
  return -1;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
