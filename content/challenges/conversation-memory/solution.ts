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

type PromiseMade = Extract<MemoryEvent, { type: "promise-made" }>;

/** Promesa vigente: la última promesa realizada, salvo que una cancelación posterior la anule. */
function activePromise(sorted: readonly MemoryEvent[]): PromiseMade | null {
  let current: PromiseMade | null = null;
  for (const event of sorted) {
    if (event.type === "promise-made") current = event;
    if (event.type === "promise-cancelled") current = null;
  }
  return current;
}

/**
 * Decide si el agente debe contactar al cliente hoy, a partir de los eventos registrados.
 * Reglas por prioridad: disputa → contacto de hoy → promesa (cumplida, vigente, recordatorio, incumplida) → estándar.
 */
export function decideNextContact(events: readonly MemoryEvent[], today: string): ContactDecision {
  // Copia ordenada (estable) por fecha: "lo más reciente" pasa a ser "lo último".
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));

  if (sorted.some((e) => e.type === "dispute-opened")) {
    return { action: "do-not-contact", reason: "Hay una disputa abierta: la gestión queda suspendida." };
  }
  if (sorted.some((e) => e.type === "contact-attempt" && e.at === today)) {
    return { action: "wait", reason: "Ya se intentó contactar hoy: se respeta la frecuencia de contacto." };
  }

  const promise = activePromise(sorted);
  if (!promise) {
    return { action: "contact", strategy: "standard", reason: "No hay una promesa de pago vigente." };
  }

  const paidSincePromise = sorted
    .filter((e): e is Extract<MemoryEvent, { type: "payment-received" }> => e.type === "payment-received")
    .filter((e) => e.at >= promise.at)
    .reduce((sum, e) => sum + e.amountCents, 0);

  if (paidSincePromise >= promise.amountCents) {
    return { action: "wait", reason: "La promesa de pago se cumplió con los pagos registrados." };
  }
  if (today < promise.dueDate) {
    return today === addDays(promise.dueDate, -1)
      ? {
          action: "contact",
          strategy: "promise-reminder",
          reason: `Mañana vence la promesa de pago (${promise.dueDate}).`,
        }
      : { action: "wait", reason: `Hay una promesa de pago vigente hasta el ${promise.dueDate}.` };
  }
  if (today === promise.dueDate) {
    return { action: "wait", reason: "La promesa vence hoy: se espera al cierre del día." };
  }
  return {
    action: "contact",
    strategy: "broken-promise",
    reason: `La promesa venció el ${promise.dueDate} y los pagos no la cubren.`,
  };
}
