export type MemoryEvent =
  | { type: "hold-created"; at: string; dueDate: string; amountCents: number }
  | { type: "hold-cancelled"; at: string }
  | { type: "payment-received"; at: string; amountCents: number }
  | { type: "contact-attempt"; at: string }
  | { type: "complaint-opened"; at: string };

export type ContactDecision =
  | { action: "contact"; strategy: "standard" | "deposit-reminder" | "deposit-overdue"; reason: string }
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
  // Versión ingenua: si alguna vez hubo una reserva retenida, espera; si no, contacta.
  const hasHold = events.some((e) => e.type === "hold-created");
  return hasHold
    ? { action: "wait", reason: "Tiene una reserva retenida" }
    : { action: "contact", strategy: "standard", reason: "Sin reservas retenidas" };
}
