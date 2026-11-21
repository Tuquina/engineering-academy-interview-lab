import { addDays, type IsoDate } from "../domain/support-world";
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
  | "return"
  | "late"
  | "compensation"
  | "schedule"
  | "history"
  | "order"
  | "greeting"
  | "unknown";

const PATTERNS: ReadonlyArray<readonly [Intent, RegExp]> = [
  [
    "injection",
    /(ignora|olvida|olvidate de) (todas )?(las |tus )?(instrucciones|reglas|politicas)|system prompt|modo desarrollador|tu prompt|actua como|sos ahora/,
  ],
  [
    "dispute",
    /no reconozco|yo no (hice|compre)|no hice (esa|esta) compra|nunca (compre|pedi)|no pedi (ningun|ese)|fraude|me robaron (la|el)/,
  ],
  ["human", /operador|una persona|un humano|asesor|supervisor|hablar con alguien|persona real/],
  [
    "do_not_contact",
    /no me (llamen|contacten|escriban|llames|escribas|manden)|dejen de (llamar|escribir|mandar)|no quiero (que me (llamen|contacten)|recibir (mas )?mensajes)/,
  ],
  ["paid", /ya pague|ya transferi|hice el pago|ya deposite|pague ayer|ya lo pague/],
  [
    "return",
    /devolver|devolucion|me (quedo|quedaron) (chico|chica|chicas|chicos|grande|grandes)|no me (sirve|sirvio)/,
  ],
  // Antes que "order": "mi pedido está atrasado" también menciona el pedido.
  ["late", /atrasad|demorad|no (me )?lleg(a|o)\b|todavia no (llega|llego)|deberia haber llegado/],
  ["compensation", /compensacion|cupon|descuento|reintegro|reembolso|que me ofrecen|opciones/],
  ["schedule", /llamame|llamenme|contactame|contactenme|escribime|mas tarde|otro dia|ahora no puedo/],
  ["history", /historial|compras anteriores|pedidos anteriores|movimientos/],
  ["order", /donde esta|mi pedido|mi compra|mi envio|seguimiento|cuando (llega|me llega)|estado (del|de mi)/],
  ["greeting", /^(hola|buenas|buen dia|buenas tardes|buenas noches)\b/],
];

export interface ParsedMessage {
  readonly intent: Intent;
  readonly normalized: string;
  readonly date: IsoDate | null;
  readonly reference: string | null;
  /** Id de pedido mencionado (`O-1002`), si lo hay. */
  readonly orderId: string | null;
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
    mentionedCustomerId !== null ||
    /pedido de (mi|otra|otro)|que compro (mi|otra|otro|el cliente|la clienta)/.test(normalized);
  let intent: Intent = "unknown";
  for (const [candidate, pattern] of PATTERNS) {
    if (pattern.test(normalized)) {
      intent = candidate;
      break;
    }
  }
  // Pedir datos de otra persona tiene prioridad sobre todo salvo un intento de inyección.
  if (asksForOther && intent !== "injection") intent = "other_customer";
  return {
    intent,
    normalized,
    date,
    reference: /\b([a-z]{2,4}-\d{3,})\b/.exec(normalized)?.[1]?.toUpperCase() ?? null,
    orderId: /\b(o-\d{4})\b/.exec(normalized)?.[1]?.toUpperCase() ?? null,
    hour: parseHour(normalized),
    mentionedCustomerId,
    channel: /whatsapp|mensaje/.test(normalized) ? "whatsapp" : /sms/.test(normalized) ? "sms" : "call",
  };
}

/** Fechas relativas y absolutas frecuentes en una conversación de atención al cliente. */
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
  const dayOnly = /\bel (dia )?(\d{1,2})\b/.exec(text);
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

function parseHour(text: string): number | null {
  const explicit = /a las (\d{1,2})/.exec(text);
  if (explicit) return Number(explicit[1]);
  if (/(a la|por la) tarde/.test(text)) return 16;
  if (/(a la|por la) manana/.test(text)) return 10;
  if (/de noche|a la noche/.test(text)) return 21;
  return null;
}
