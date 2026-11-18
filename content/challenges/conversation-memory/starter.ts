export type MemoryEvent =
  | { type: "promise-made"; at: string; dueDate: string; amountCents: number }
  | { type: "promise-cancelled"; at: string }
  | { type: "payment-received"; at: string; amountCents: number }
  | { type: "contact-attempt"; at: string }
  | { type: "dispute-opened"; at: string };

export type ContactDecision =
  | { action: "contact"; strategy: "standard" | "promise-reminder" | "broken-promise"; reason: string }
  | { action: "wait"; reason: string }
  | { action: "do-not-contact"; reason: string };

/** Suma `days` días a una fecha `YYYY-MM-DD`. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Decide si el agente debe contactar al cliente hoy, a partir de los eventos registrados.
 */
export function decideNextContact(events: readonly MemoryEvent[], today: string): ContactDecision {
  // Versión ingenua: si alguna vez hubo una promesa, espera; si no, contacta.
  const hasPromise = events.some((e) => e.type === "promise-made");
  return hasPromise
    ? { action: "wait", reason: "Tiene una promesa de pago" }
    : { action: "contact", strategy: "standard", reason: "Sin promesas registradas" };
}
