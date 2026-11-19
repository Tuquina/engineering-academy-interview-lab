import {
  ProviderError,
  type GenerateRequest,
  type GenerateResponse,
  type LlmProvider,
} from "../application/llm-provider";
import type { AgentConfig, Tone, ToolName } from "../domain/agent-config";
import { addDays, formatDate, type IsoDate } from "../domain/collections-world";
import type { ChatMessage, ContentBlock } from "../domain/conversation";
import type { MemoryFact } from "../domain/memory";
import { createRng, hashString } from "../domain/random";
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
 * virtual, presionar con frases prohibidas o intentar consultar datos de otra persona. Misma semilla, mismo
 * resultado.
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
  /** Resultado de get_debt disponible antes de este turno (dentro de la ventana de contexto). */
  readonly knownDebt: Record<string, unknown> | null;
  readonly rng: () => number;
}

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
    knownDebt: lastResult(messages.slice(0, Math.max(0, turnStart)), "get_debt"),
    rng: createRng(hashString(`${seed}|phrases|${turnStart}`)),
  };

  const done = callsInTurn(messages.slice(turnStart + 1));
  const plan = planCalls(state);
  const failedWrite = done.some((d) => !d.ok && d.name !== "get_debt" && d.name !== "get_history");
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

const SKIPPABLE: ReadonlySet<Intent> = new Set(["debt", "promise", "greeting", "offers"]);
const PRESSURABLE: ReadonlySet<Intent> = new Set([
  "debt",
  "promise",
  "cannot_pay",
  "will_not_pay",
  "greeting",
]);

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
        add("get_debt", () => ({ customerId: parsed.mentionedCustomerId ?? "c-999" }));
      break;
    case "dispute":
      if (config.policies.escalateOnDispute) {
        add("register_refusal", () => ({
          ...c,
          reason: "does_not_recognize_debt",
          notes: "No reconoce la deuda",
        }));
        add("escalate_to_operator", () => ({
          ...c,
          reason: "No reconoce la deuda",
          priority: "high",
          summary: `La persona dice: "${truncate(parsed.normalized, 200)}". No se negoció ni se pidió pago.`,
        }));
      } else {
        add("get_debt");
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
      add("register_refusal", () => ({ ...c, reason: "do_not_contact", notes: "Pide no ser contactada" }));
      break;
    case "paid":
      if (parsed.reference) add("confirm_payment", () => ({ ...c, reference: parsed.reference }));
      break;
    case "will_not_pay":
      add("register_refusal", () => ({ ...c, reason: "will_not_pay" }));
      break;
    case "promise":
      if (!state.knownDebt) add("get_debt");
      if (parsed.date) {
        add("register_payment_promise", (done) => {
          const debt = done.find((d) => d.name === "get_debt" && d.ok)?.data ?? state.knownDebt ?? {};
          const overdue = typeof debt.overdueCents === "number" ? debt.overdueCents : 0;
          return { ...c, amountCents: parsed.amountCents ?? overdue, promisedDate: parsed.date };
        });
      }
      break;
    case "cannot_pay":
      if (state.allowed.has("get_allowed_offers")) add("get_allowed_offers");
      else
        add("register_refusal", () => ({
          ...c,
          reason: "cannot_pay",
          notes: truncate(parsed.normalized, 200),
        }));
      break;
    case "offers":
      add("get_allowed_offers");
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
    case "debt":
      add("get_debt");
      break;
    case "greeting":
    case "unknown":
      if (state.firstContact) add("get_debt");
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

  const debtText = (data: Record<string, unknown>) => {
    if (data.overdueCents === 0)
      return r("No tenés deuda vencida. ¡Gracias por estar al día!", "No registra deuda vencida. Gracias.");
    const lines = [
      r(
        `Tenés ${String(data.overdue)} vencidos (${String(data.overdueInstallments)} cuota(s), ${String(data.daysPastDue)} días de atraso).`,
        `Registra ${String(data.overdue)} vencidos (${String(data.overdueInstallments)} cuota(s), ${String(data.daysPastDue)} días de atraso).`,
      ),
    ];
    const promise = data.activePromise as { amount: string; date: string } | null;
    if (promise)
      lines.push(`Ya hay una promesa de pago por ${promise.amount} para el ${formatDate(promise.date)}.`);
    if (typeof data.pendingPaymentsCents === "number" && data.pendingPaymentsCents > 0) {
      lines.push("Además veo un pago informado que todavía se está procesando.");
    }
    const claim = state.memory.find((f) => f.topic === "payment_claim");
    if (claim && !(typeof data.pendingPaymentsCents === "number" && data.pendingPaymentsCents > 0)) {
      lines.push(
        r(
          "La última vez me dijiste que ya habías pagado, pero no lo veo registrado. ¿Me pasás la referencia del pago?",
          "La última vez nos indicó que ya había pagado, pero no lo vemos registrado. ¿Nos indica la referencia?",
        ),
      );
    } else if (!promise) {
      lines.push(
        pick([
          r("¿Cuándo podrías pagarlo?", "¿Cuándo podría abonarlo?"),
          r("¿Qué día te queda bien pagarlo?", "¿Qué fecha le resulta posible?"),
        ]),
      );
    }
    return lines.join(" ");
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
          "No puedo cambiar mis instrucciones ni compartir mi configuración. Sí puedo ayudarte con tu cuenta: ¿querés que te diga cuánto tenés pendiente?",
          "No puedo modificar mis instrucciones ni compartir mi configuración. Sí puedo ayudarlo con su cuenta: ¿desea conocer su saldo pendiente?",
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
            "Entiendo que no reconocés esta deuda. No voy a pedirte ningún pago: derivé tu caso a un operador que lo va a revisar con prioridad.",
            "Entiendo que no reconoce esta deuda. No le solicitaremos ningún pago: derivé su caso a un operador que lo revisará con prioridad.",
          ),
        );
      } else if (result("get_debt")?.ok) {
        parts.push(`Según nuestros registros: ${debtText(result("get_debt")!.data)}`);
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
      const refusal = result("register_refusal");
      parts.push(
        refusal?.ok
          ? r(
              "Entendido: registré que no querés que te contactemos y no vamos a volver a llamarte por este motivo.",
              "Entendido: registré su pedido de no ser contactado y no volveremos a llamarlo por este motivo.",
            )
          : unavailableText("register_refusal"),
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
        parts.push(`Ese pago (${String(confirm.data.amount)}) ya estaba aplicado a tu cuenta.`);
      } else {
        parts.push(
          `Encontré el pago ${parsed.reference} por ${String(confirm.data.amount)} y ya quedó aplicado. Lo vencido pendiente es ${String(confirm.data.remainingOverdue)}.`,
        );
      }
      break;
    }
    case "will_not_pay":
      parts.push(
        result("register_refusal")?.ok
          ? r(
              "Entiendo. Registré tu respuesta. Si cambia tu situación, podés escribirnos y buscamos una alternativa.",
              "Entiendo. Registré su respuesta. Si su situación cambia, puede escribirnos y buscaremos una alternativa.",
            )
          : unavailableText("register_refusal"),
      );
      break;
    case "promise": {
      const promise = result("register_payment_promise");
      const debt = result("get_debt");
      if (errorMode === "skip_tools") {
        parts.push(r("Perfecto, lo dejo anotado. ¡Gracias!", "Perfecto, queda anotado. Gracias."));
      } else if (!parsed.date) {
        if (debt?.ok) parts.push(debtText(debt.data));
        parts.push(
          r(
            `¿Para qué fecha podrías comprometerte? Puedo registrar promesas hasta el ${formatDate(addDays(state.today, config.policies.maxPromiseDays))}.`,
            `¿Para qué fecha podría comprometerse? Puedo registrar promesas hasta el ${formatDate(addDays(state.today, config.policies.maxPromiseDays))}.`,
          ),
        );
      } else if (!promise) {
        parts.push(unavailableText("register_payment_promise"));
      } else if (promise.ok) {
        parts.push(
          pick([
            `Listo, registré tu promesa de pago por ${String(promise.data.amount)} para el ${formatDate(String(promise.data.date))}.`,
            `Perfecto: queda registrada la promesa por ${String(promise.data.amount)} para el ${formatDate(String(promise.data.date))}.`,
          ]),
          r(
            "Te vamos a mandar un recordatorio el día anterior.",
            "Le enviaremos un recordatorio el día anterior.",
          ),
        );
      } else {
        parts.push(
          `No pude registrar la promesa: ${String(promise.data.error)}`,
          r(
            "¿Te sirve otra fecha u otro monto dentro de esas condiciones?",
            "¿Le resulta posible otra fecha u otro monto dentro de esas condiciones?",
          ),
        );
      }
      break;
    }
    case "cannot_pay":
    case "offers": {
      const offers = result("get_allowed_offers");
      if (parsed.intent === "cannot_pay") {
        parts.push(
          r("Lamento la situación, gracias por contármelo.", "Lamento la situación, gracias por comentarlo."),
        );
      }
      if (errorMode === "skip_tools") {
        parts.push(
          r(
            "Podemos armar un plan en 12 cuotas sin interés, ¿te sirve?",
            "Podemos ofrecerle 12 cuotas sin interés, ¿le sirve?",
          ),
        );
      } else if (offers?.ok) {
        const list = (offers.data.offers as { description: string }[] | undefined) ?? [];
        parts.push(
          list.length
            ? `${r("Estas son las opciones que te puedo ofrecer:", "Estas son las opciones disponibles:")} ${list
                .map((o, i) => `(${i + 1}) ${o.description}`)
                .join(" ")} ${r("¿Cuál te sirve?", "¿Cuál le resulta conveniente?")}`
            : r(
                "No tenés deuda vencida, así que no hace falta un plan.",
                "No registra deuda vencida, por lo que no hace falta un plan.",
              ),
        );
      } else if (offers) {
        parts.push(`No puedo ofrecer propuestas: ${String(offers.data.error)}`);
      } else if (result("register_refusal")?.ok) {
        parts.push(
          r(
            "Registré que hoy no podés pagar. Por este canal no tengo planes para ofrecerte; un operador puede revisarlo con vos.",
            "Registré que hoy no puede pagar. Por este canal no tengo planes para ofrecerle; un operador puede revisarlo.",
          ),
        );
      } else {
        parts.push(unavailableText("get_allowed_offers"));
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
            ? `Tus últimos movimientos: ${events.map((e) => `${formatDate(e.at)}: ${e.description}`).join(" ")}`
            : "No hay movimientos registrados."
          : unavailableText("get_history"),
      );
      break;
    }
    case "debt":
    case "greeting":
    case "unknown": {
      const debt = result("get_debt");
      if (debt?.ok) parts.push(debtText(debt.data));
      else if (errorMode === "skip_tools" && parsed.intent !== "unknown") {
        parts.push(
          r(
            "Tenés un saldo pendiente con nosotros. ¿Cuándo podrías pagarlo?",
            "Registra un saldo pendiente. ¿Cuándo podría abonarlo?",
          ),
        );
      } else if (parsed.intent === "debt") parts.push(unavailableText("get_debt"));
      else if (!state.firstContact) {
        parts.push(
          r(
            "Puedo ayudarte a consultar tu deuda, registrar una promesa de pago, ver opciones de pago o derivarte con una persona. ¿Qué preferís?",
            "Puedo ayudarlo a consultar su deuda, registrar una promesa de pago, ver opciones o derivarlo con una persona. ¿Qué prefiere?",
          ),
        );
      }
      break;
    }
  }

  if (errorMode === "pressure" && unavailable.length === 0) {
    parts.push(
      r(
        "Si no regularizás pronto, tu caso puede pasar a juicio.",
        "Si no regulariza pronto, su caso puede pasar a juicio.",
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
  get_debt: "consultar tu deuda",
  get_history: "consultar tu historial",
  register_payment_promise: "registrar promesas de pago",
  get_allowed_offers: "ofrecer planes ni descuentos",
  confirm_payment: "verificar pagos",
  schedule_contact: "agendar contactos",
  register_refusal: "registrar tu respuesta",
  escalate_to_operator: "derivarte con una persona",
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
