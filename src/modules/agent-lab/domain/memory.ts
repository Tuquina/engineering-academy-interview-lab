import {
  activeReturn,
  addDays,
  daysBetween,
  findCustomer,
  formatDate,
  orderSummary,
  type IsoDate,
  type SupportWorld,
} from "./support-world";

/**
 * Memoria de un agente entre conversaciones (MASTER_PROMPT §16.5).
 *
 * Hay tres fuentes distintas, con distinta autoridad:
 *
 * 1. **Memoria conversacional**: hechos que el agente extrajo de lo que dijo la persona ("prefiere que la llamen a
 *    la tarde", "dice que ya despachó el paquete"). Son útiles para personalizar, pero son **afirmaciones**: pueden
 *    estar desactualizadas o ser falsas.
 * 2. **Estado estructurado del negocio**: pedidos, pagos, devoluciones (el sistema de registro). Es la verdad para
 *    decidir.
 * 3. **Historial de eventos**: qué pasó y cuándo. Permite auditar y reconstruir cómo se llegó al estado actual.
 *
 * Regla central: ante una contradicción, el estado del negocio gana sobre lo recordado de una conversación.
 */

export type FactKind = "commitment" | "preference" | "claim" | "context";

export interface MemoryFact {
  readonly id: string;
  readonly customerId: string;
  readonly kind: FactKind;
  readonly text: string;
  readonly observedAt: IsoDate;
  /** Fecha a partir de la cual el hecho ya no aplica (un retiro ya pasado, una preferencia temporal). */
  readonly expiresAt: IsoDate | null;
  /** Hecho que lo reemplaza (por ejemplo, una preferencia más nueva sobre lo mismo). */
  readonly supersededBy: string | null;
  /** Clave para detectar hechos sobre el mismo tema (`contact_time`, `payment_claim`…). */
  readonly topic: string;
}

export const FACT_KIND_LABELS: Record<FactKind, string> = {
  commitment: "Compromiso",
  preference: "Preferencia",
  claim: "Afirmación",
  context: "Contexto",
};

/** Antigüedad a partir de la cual un hecho se considera posiblemente desactualizado. */
export const STALE_AFTER_DAYS = 30;

/** Plazo de devolución usado por la memoria para describir el pedido (el de la política por defecto). */
const RETURN_WINDOW_DAYS = 30;

export interface RecalledFact {
  readonly fact: MemoryFact;
  readonly status: "active" | "stale" | "expired" | "superseded";
}

/** Clasifica cada hecho del cliente según la fecha: activo, viejo, vencido o reemplazado. */
export function recallFacts(
  facts: readonly MemoryFact[],
  customerId: string,
  today: IsoDate,
): RecalledFact[] {
  return facts
    .filter((f) => f.customerId === customerId && f.observedAt <= today)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .map((fact) => {
      if (fact.supersededBy) return { fact, status: "superseded" as const };
      if (fact.expiresAt && fact.expiresAt < today) return { fact, status: "expired" as const };
      if (daysBetween(fact.observedAt, today) > STALE_AFTER_DAYS) return { fact, status: "stale" as const };
      return { fact, status: "active" as const };
    });
}

/** Hechos que se le pasan al agente: sólo los activos (los viejos, marcados como tales). */
export function factsForPrompt(
  facts: readonly MemoryFact[],
  customerId: string,
  today: IsoDate,
): MemoryFact[] {
  return recallFacts(facts, customerId, today)
    .filter((r) => r.status === "active" || r.status === "stale")
    .map((r) =>
      r.status === "stale" ? { ...r.fact, text: `${r.fact.text} (dato de hace más de un mes)` } : r.fact,
    );
}

/** Agrega un hecho y marca como reemplazados los anteriores del mismo tema. */
export function rememberFact(facts: readonly MemoryFact[], fact: MemoryFact): MemoryFact[] {
  return [
    ...facts.map((f) =>
      f.customerId === fact.customerId && f.topic === fact.topic && !f.supersededBy
        ? { ...f, supersededBy: fact.id }
        : f,
    ),
    fact,
  ];
}

export interface Contradiction {
  readonly factId: string;
  readonly message: string;
  readonly resolution: string;
}

/**
 * Compara lo recordado con el sistema de registro y explica qué se cree y por qué.
 * No borra hechos: los marca, porque saber que alguien afirmó algo falso también es información.
 */
export function reconcile(
  facts: readonly MemoryFact[],
  world: SupportWorld,
  customerId: string,
  today: IsoDate,
): Contradiction[] {
  const result: Contradiction[] = [];
  const order = orderSummary(world, customerId, today, RETURN_WINDOW_DAYS);
  const pendingReturn = activeReturn(world, customerId);
  for (const { fact, status } of recallFacts(facts, customerId, today)) {
    if (status === "superseded") continue;
    if (
      fact.topic === "payment_claim" &&
      order?.status === "pending_payment" &&
      order.pendingPaymentsCents === 0
    ) {
      result.push({
        factId: fact.id,
        message: `Memoria del ${formatDate(fact.observedAt)}: "${fact.text}". El pedido ${order.orderId} sigue pendiente de pago y no hay pagos informados.`,
        resolution: "Gana el sistema de registro: se pide la referencia del pago y no se despacha el pedido.",
      });
    }
    if (fact.topic === "return_claim" && pendingReturn) {
      result.push({
        factId: fact.id,
        message: `Memoria del ${formatDate(fact.observedAt)}: "${fact.text}". El sistema todavía tiene la devolución ${pendingReturn.id} esperando el retiro del ${formatDate(pendingReturn.pickupDate)}.`,
        resolution:
          "Gana el sistema de registro: el reembolso se libera cuando el transportista registra el retiro, no por lo que se dijo en el chat.",
      });
    }
    if (fact.topic === "return" && !pendingReturn) {
      result.push({
        factId: fact.id,
        message: `La memoria recuerda "${fact.text}", pero no hay una devolución programada en el sistema.`,
        resolution:
          "El retiro se hizo o no se concretó: la memoria quedó desactualizada y no habilita a esperar.",
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------------------------
// Elegibilidad de contacto proactivo: la decisión del Día 5
// ---------------------------------------------------------------------------------------------------------------

export interface EligibilityDecision {
  readonly eligible: boolean;
  readonly action:
    "contact" | "reminder_only" | "wait" | "do_not_contact" | "route_to_operator" | "nothing_due";
  readonly reasons: readonly string[];
  /** Qué fuente fundamentó la decisión. */
  readonly basis: "business_state" | "memory" | "both";
}

/**
 * Decide si los avisos proactivos del soporte (demoras, retiros, pagos) pueden contactar a un cliente en una fecha.
 *
 * Se basa en el estado del negocio (devolución programada, pago en proceso, pedido de no contacto, cargo no
 * reconocido); la memoria sólo **ajusta** cómo contactar (por ejemplo, la franja horaria preferida), nunca habilita
 * algo que el estado prohíbe.
 */
export function decideContactEligibility(
  world: SupportWorld,
  facts: readonly MemoryFact[],
  customerId: string,
  date: IsoDate,
): EligibilityDecision {
  const customer = findCustomer(world, customerId);
  if (!customer)
    return {
      eligible: false,
      action: "nothing_due",
      reasons: ["Cliente inexistente."],
      basis: "business_state",
    };
  if (customer.doNotContact) {
    return {
      eligible: false,
      action: "do_not_contact",
      reasons: ["La persona pidió no ser contactada (registrado en el sistema)."],
      basis: "business_state",
    };
  }
  if (customer.disputed) {
    return {
      eligible: false,
      action: "route_to_operator",
      reasons: ["Hay un cargo no reconocido: lo gestiona un operador, no un aviso automático."],
      basis: "business_state",
    };
  }
  const order = orderSummary(world, customerId, date, RETURN_WINDOW_DAYS);
  if (order && order.pendingPaymentsCents > 0) {
    return {
      eligible: false,
      action: "wait",
      reasons: [
        "Hay un pago informado que se está procesando: avisar ahora que el pedido no está pago sería un error.",
      ],
      basis: "business_state",
    };
  }
  const preference = factsForPrompt(facts, customerId, date).find((f) => f.topic === "contact_time");
  const tail = preference ? [`Memoria: ${preference.text}. Se respeta al programar.`] : [];
  const basis = preference ? ("both" as const) : ("business_state" as const);
  const scheduled = activeReturn(world, customerId);
  if (scheduled && scheduled.pickupDate >= date) {
    if (date === addDays(scheduled.pickupDate, -1)) {
      return {
        eligible: true,
        action: "reminder_only",
        reasons: [
          `Mañana es el retiro de la devolución (${formatDate(scheduled.pickupDate)}): sólo se envía un recordatorio.`,
          ...tail,
        ],
        basis,
      };
    }
    return {
      eligible: false,
      action: "wait",
      reasons: [
        `Hay una devolución con retiro el ${formatDate(scheduled.pickupDate)}: no se envían avisos antes de la víspera.`,
      ],
      basis: "business_state",
    };
  }
  const missed = world.returns.filter((r) => r.customerId === customerId && r.status === "missed").at(-1);
  if (missed) {
    return {
      eligible: true,
      action: "contact",
      reasons: [
        `El retiro del ${formatDate(missed.pickupDate)} no se concretó: se contacta para reprogramarlo.`,
        ...tail,
      ],
      basis,
    };
  }
  if (order && order.status === "shipped" && order.daysLate > 0) {
    return {
      eligible: true,
      action: "contact",
      reasons: [
        `El pedido ${order.orderId} lleva ${order.daysLate} día(s) de demora: se avisa de forma proactiva.`,
        ...tail,
      ],
      basis,
    };
  }
  return {
    eligible: false,
    action: "nothing_due",
    reasons: ["No hay demoras, retiros ni pagos pendientes que avisar."],
    basis: "business_state",
  };
}

/** Marca como no realizados los retiros cuya fecha ya pasó (lo que haría un job diario con datos del transportista). */
export function expireReturns(world: SupportWorld, today: IsoDate): SupportWorld {
  const expired = world.returns.filter((r) => r.status === "scheduled" && r.pickupDate < today);
  if (expired.length === 0) return world;
  const ids = new Set(expired.map((r) => r.id));
  return {
    ...world,
    returns: world.returns.map((r) => (ids.has(r.id) ? { ...r, status: "missed" as const } : r)),
    events: [
      ...world.events,
      ...expired.map((r, i) => ({
        id: `E-exp-${r.id}-${i}`,
        customerId: r.customerId,
        at: addDays(r.pickupDate, 1),
        type: "pickup_missed",
        description: `El transportista no retiró la devolución ${r.id} el día acordado.`,
      })),
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Extracción de hechos de una conversación
// ---------------------------------------------------------------------------------------------------------------

export function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Extrae hechos memorables de un mensaje de la persona. Es una extracción por reglas, transparente y determinista;
 * en producción suele hacerse con un modelo y una salida estructurada, y se valida igual que acá.
 */
export function extractFacts(
  message: string,
  customerId: string,
  today: IsoDate,
  nextFactId: () => string,
): MemoryFact[] {
  const text = normalizeText(message);
  const facts: MemoryFact[] = [];
  const base = { customerId, observedAt: today, supersededBy: null };
  if (/\b(a la tarde|por la tarde|despues de las \d+|a la manana|por la manana|de noche)\b/.test(text)) {
    const slot = /tarde|despues/.test(text)
      ? "por la tarde"
      : /noche/.test(text)
        ? "de noche"
        : "por la mañana";
    facts.push({
      ...base,
      id: nextFactId(),
      kind: "preference",
      topic: "contact_time",
      text: `Prefiere que lo contacten ${slot}`,
      expiresAt: null,
    });
  }
  if (/\b(ya pague|ya transferi|hice el pago|ya deposite)\b/.test(text)) {
    facts.push({
      ...base,
      id: nextFactId(),
      kind: "claim",
      topic: "payment_claim",
      text: "Dice que ya pagó",
      expiresAt: addDays(today, 7),
    });
  }
  if (/\b(ya (lo |la |los |las )?(despache|devolvi|lleve al correo|entregue el paquete))\b/.test(text)) {
    facts.push({
      ...base,
      id: nextFactId(),
      kind: "claim",
      topic: "return_claim",
      text: "Dice que ya despachó el paquete de la devolución",
      expiresAt: addDays(today, 7),
    });
  }
  if (/\b(regalo|cumpleanos)\b/.test(text)) {
    facts.push({
      ...base,
      id: nextFactId(),
      kind: "context",
      topic: "gift",
      text: "Comentó que el pedido es un regalo",
      expiresAt: null,
    });
  }
  return facts;
}

/** Hecho de compromiso derivado de una devolución programada con éxito (lo confirma una herramienta). */
export function returnFact(
  id: string,
  customerId: string,
  today: IsoDate,
  pickupDate: IsoDate,
  orderId: string,
): MemoryFact {
  return {
    id,
    customerId,
    kind: "commitment",
    topic: "return",
    text: `Coordinó el retiro de la devolución del pedido ${orderId} el ${formatDate(pickupDate)}`,
    observedAt: today,
    // Vence al terminar el día del retiro: desde el día siguiente ya no describe un compromiso vigente.
    expiresAt: pickupDate,
    supersededBy: null,
  };
}
