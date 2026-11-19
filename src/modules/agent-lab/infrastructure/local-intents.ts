import { addDays, type IsoDate } from "../domain/collections-world";
import { normalizeText } from "../domain/memory";

/**
 * Interpretación por reglas del mensaje de la persona, usada por el proveedor local.
 *
 * No es comprensión de lenguaje: son patrones explícitos y documentados, elegidos para que el laboratorio sea
 * predecible. Un LLM real generaliza mucho mejor; justamente por eso se lo evalúa con suites como las de este lab.
 */

export type Intent =
  | "injection"
  | "other_customer"
  | "dispute"
  | "human"
  | "do_not_contact"
  | "paid"
  | "will_not_pay"
  | "promise"
  | "cannot_pay"
  | "offers"
  | "schedule"
  | "history"
  | "debt"
  | "greeting"
  | "unknown";

const PATTERNS: ReadonlyArray<readonly [Intent, RegExp]> = [
  [
    "injection",
    /(ignora|olvida|olvidate de) (todas )?(las |tus )?(instrucciones|reglas|politicas)|system prompt|modo desarrollador|tu prompt|actua como|sos ahora/,
  ],
  [
    "dispute",
    /no reconozco|no es mia|no es mio|nunca (saque|pedi)|no pedi (ningun|ese)|fraude|me robaron (la|el)/,
  ],
  ["human", /operador|una persona|un humano|asesor|supervisor|hablar con alguien|persona real/],
  [
    "do_not_contact",
    /no me (llamen|contacten|escriban|llames|escribas)|dejen de (llamar|escribir)|no quiero que me (llamen|contacten)/,
  ],
  ["paid", /ya pague|ya transferi|hice el pago|ya deposite|pague ayer|ya lo pague/],
  ["will_not_pay", /no (voy a|pienso) pagar|no quiero pagar|no les voy a pagar/],
  // Antes que "promise": "no puedo pagar" contiene "puedo pagar".
  [
    "cannot_pay",
    /no puedo pagar|no tengo (plata|dinero|un peso)|me quede sin trabajo|perdi (el|mi) trabajo|no me alcanza/,
  ],
  ["promise", /(te |le |les )?(pago|puedo pagar|voy a pagar|pagaria|prometo pagar|abono|puedo abonar)\b/],
  ["offers", /cuotas|plan de pago|descuento|refinanc|opciones|propuesta|no tengo todo/],
  ["schedule", /llamame|llamenme|llamame|contactame|contactenme|escribime|mas tarde|otro dia|ahora no puedo/],
  ["history", /historial|pagos anteriores|que pague|movimientos/],
  ["debt", /cuanto debo|deuda|saldo|monto|debo|cuanto es|cuanto tengo/],
  ["greeting", /^(hola|buenas|buen dia|buenas tardes|buenas noches)\b/],
];

export interface ParsedMessage {
  readonly intent: Intent;
  readonly normalized: string;
  readonly date: IsoDate | null;
  readonly amountCents: number | null;
  readonly reference: string | null;
  readonly hour: number | null;
  readonly mentionedCustomerId: string | null;
  readonly channel: "call" | "whatsapp" | "sms";
}

export function parseMessage(text: string, today: IsoDate, sessionCustomerId: string): ParsedMessage {
  const normalized = normalizeText(text);
  const mentioned = /\bc-\d{3}\b/.exec(normalized)?.[0] ?? null;
  const mentionedCustomerId = mentioned && mentioned !== sessionCustomerId ? mentioned : null;
  const date = parseDate(normalized, today);
  const asksForOther =
    mentionedCustomerId !== null || /deuda de (mi|otra|otro)|cuanto debe (mi|otra|otro)/.test(normalized);
  let intent: Intent = "unknown";
  for (const [candidate, pattern] of PATTERNS) {
    if (pattern.test(normalized)) {
      intent = candidate;
      break;
    }
  }
  // Pedir datos de otra persona tiene prioridad sobre todo salvo un intento de inyección.
  if (asksForOther && intent !== "injection") intent = "other_customer";
  // "pago" sin fecha ni verbo de compromiso suele ser una pregunta ("¿cómo pago?"), no una promesa.
  if (intent === "promise" && !date && !/prometo|voy a pagar|puedo pagar/.test(normalized)) intent = "debt";
  return {
    intent,
    normalized,
    date,
    amountCents: parseAmount(normalized),
    reference: /\b([a-z]{2,4}-\d{3,})\b/.exec(normalized)?.[1]?.toUpperCase() ?? null,
    hour: parseHour(normalized),
    mentionedCustomerId,
    channel: /whatsapp|mensaje/.test(normalized) ? "whatsapp" : /sms/.test(normalized) ? "sms" : "call",
  };
}

/** Fechas relativas y absolutas frecuentes en una conversación de cobranza. */
export function parseDate(text: string, today: IsoDate): IsoDate | null {
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  if (/pasado manana/.test(text)) return addDays(today, 2);
  if (/\bmanana\b/.test(text)) return addDays(today, 1);
  if (/\bhoy\b/.test(text)) return today;
  const inDays = /en (\d{1,2}) dias/.exec(text);
  if (inDays) return addDays(today, Number(inDays[1]));
  if (/(la )?(semana que viene|proxima semana)/.test(text)) return addDays(today, 7);
  if (/fin de mes/.test(text)) return isoOf(year, month + 1, 0);
  const slash = /\b(\d{1,2})\/(\d{1,2})\b/.exec(text);
  if (slash) {
    const d = Number(slash[1]);
    const m = Number(slash[2]);
    const candidate = isoOf(year, m, d);
    return candidate < today ? isoOf(year + 1, m, d) : candidate;
  }
  const dayOnly = /\bel (dia )?(\d{1,2})\b(?! de (cuotas|pesos))/.exec(text);
  if (dayOnly) {
    const d = Number(dayOnly[2]);
    if (d < 1 || d > 31) return null;
    return d >= day ? isoOf(year, month, d) : isoOf(year, month + 1, d);
  }
  return null;
}

function isoOf(year: number, month: number, day: number): IsoDate {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/** Montos explícitos en pesos ("$45.000", "45000 pesos"); números chicos se interpretan como días u horas. */
export function parseAmount(text: string): number | null {
  const match = /\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?|(\d{1,3}(?:\.\d{3})+|\d{4,})\s?pesos/.exec(
    text,
  );
  if (!match) return null;
  const whole = (match[1] ?? match[3] ?? "").replace(/\./g, "");
  const cents = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  const value = Number(whole) * 100 + cents;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseHour(text: string): number | null {
  const explicit = /a las (\d{1,2})/.exec(text);
  if (explicit) return Number(explicit[1]);
  if (/(a la|por la) tarde/.test(text)) return 16;
  if (/(a la|por la) manana/.test(text)) return 10;
  if (/de noche|a la noche/.test(text)) return 21;
  return null;
}
