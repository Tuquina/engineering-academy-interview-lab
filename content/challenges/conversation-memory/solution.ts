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

type HoldCreated = Extract<MemoryEvent, { type: "hold-created" }>;

/** Reserva retenida vigente: la última creada, salvo que una cancelación posterior la anule. */
function activeHold(sorted: readonly MemoryEvent[]): HoldCreated | null {
  let current: HoldCreated | null = null;
  for (const event of sorted) {
    if (event.type === "hold-created") current = event;
    if (event.type === "hold-cancelled") current = null;
  }
  return current;
}

/**
 * Decide si el agente debe contactar al cliente hoy, a partir de los eventos registrados.
 * Reglas por prioridad: reclamo → contacto de hoy → seña (pagada, vigente, recordatorio, vencida) → estándar.
 */
export function decideNextContact(events: readonly MemoryEvent[], today: string): ContactDecision {
  // Copia ordenada (estable) por fecha: "lo más reciente" pasa a ser "lo último".
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));

  if (sorted.some((e) => e.type === "complaint-opened")) {
    return {
      action: "do-not-contact",
      reason: "Hay un reclamo abierto: lo atiende una persona y no se envían avisos automáticos.",
    };
  }
  if (sorted.some((e) => e.type === "contact-attempt" && e.at === today)) {
    return { action: "wait", reason: "Ya se intentó contactar hoy: se respeta la frecuencia de contacto." };
  }

  const hold = activeHold(sorted);
  if (!hold) {
    return { action: "contact", strategy: "standard", reason: "No hay una reserva con seña pendiente." };
  }

  const paidSinceHold = sorted
    .filter((e): e is Extract<MemoryEvent, { type: "payment-received" }> => e.type === "payment-received")
    .filter((e) => e.at >= hold.at)
    .reduce((sum, e) => sum + e.amountCents, 0);

  if (paidSinceHold >= hold.amountCents) {
    return { action: "wait", reason: "La seña está pagada con los pagos registrados: no hace falta avisar." };
  }
  if (today < hold.dueDate) {
    return today === addDays(hold.dueDate, -1)
      ? {
          action: "contact",
          strategy: "deposit-reminder",
          reason: `Mañana vence el plazo para pagar la seña (${hold.dueDate}).`,
        }
      : {
          action: "wait",
          reason: `La reserva está retenida hasta el ${hold.dueDate} a la espera de la seña.`,
        };
  }
  if (today === hold.dueDate) {
    return { action: "wait", reason: "El plazo de la seña vence hoy: se espera al cierre del día." };
  }
  return {
    action: "contact",
    strategy: "deposit-overdue",
    reason: `El plazo de la seña venció el ${hold.dueDate} y los pagos no la cubren: se avisa antes de liberar la habitación.`,
  };
}
