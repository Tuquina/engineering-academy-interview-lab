import {
  activePromise,
  addDays,
  daysBetween,
  debtSummary,
  findCustomer,
  formatDate,
  type CollectionsWorld,
  type IsoDate,
} from "./collections-world";

/**
 * Memoria de un agente entre conversaciones (MASTER_PROMPT §16.5).
 *
 * Hay tres fuentes distintas, con distinta autoridad:
 *
 * 1. **Memoria conversacional**: hechos que el agente extrajo de lo que dijo la persona ("prefiere que la llamen a
 *    la tarde", "dice que ya pagó"). Son útiles para personalizar, pero son **afirmaciones**: pueden estar
 *    desactualizadas o ser falsas.
 * 2. **Estado estructurado del negocio**: cuotas, pagos, promesas (el sistema de registro). Es la verdad para
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
  /** Fecha a partir de la cual el hecho ya no aplica (una promesa vencida, una preferencia temporal). */
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
  world: CollectionsWorld,
  customerId: string,
  today: IsoDate,
): Contradiction[] {
  const result: Contradiction[] = [];
  const debt = debtSummary(world, customerId, today);
  const promise = activePromise(world, customerId);
  for (const { fact, status } of recallFacts(facts, customerId, today)) {
    if (status === "superseded") continue;
    if (fact.topic === "payment_claim" && debt.pendingPaymentsCents === 0 && debt.overdueCents > 0) {
      const appliedAfter = world.events.some(
        (e) => e.customerId === customerId && e.type === "payment_applied" && e.at >= fact.observedAt,
      );
      if (!appliedAfter) {
        result.push({
          factId: fact.id,
          message: `Memoria del ${formatDate(fact.observedAt)}: "${fact.text}". El sistema no tiene pagos pendientes ni aplicados desde esa fecha.`,
          resolution:
            "Gana el sistema de registro: se pide la referencia del pago y no se da la deuda por saldada.",
        });
      }
    }
    if (fact.topic === "promise" && !promise) {
      result.push({
        factId: fact.id,
        message: `La memoria recuerda "${fact.text}", pero no hay una promesa activa en el sistema.`,
        resolution:
          "La promesa se cumplió o venció: la memoria quedó desactualizada y no habilita a esperar.",
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------------------------
// Elegibilidad de contacto: la decisión del Día 5
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
 * Decide si una campaña de cobranza puede contactar a un cliente en una fecha.
 *
 * Se basa en el estado del negocio (promesa activa, pago pendiente, pedido de no contacto, disputa); la memoria
 * sólo **ajusta** cómo contactar (por ejemplo, la franja horaria preferida), nunca habilita algo que el estado
 * prohíbe.
 */
export function decideContactEligibility(
  world: CollectionsWorld,
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
      reasons: ["La deuda está en disputa: la gestiona un operador, no una campaña automática."],
      basis: "business_state",
    };
  }
  const debt = debtSummary(world, customerId, date);
  if (debt.overdueCents === 0) {
    return {
      eligible: false,
      action: "nothing_due",
      reasons: ["No hay deuda vencida."],
      basis: "business_state",
    };
  }
  if (debt.pendingPaymentsCents > 0) {
    return {
      eligible: false,
      action: "wait",
      reasons: [
        "Hay un pago informado pendiente de aplicar: contactar ahora sería cobrar algo que quizás ya se pagó.",
      ],
      basis: "business_state",
    };
  }
  const promise = activePromise(world, customerId);
  const preference = factsForPrompt(facts, customerId, date).find((f) => f.topic === "contact_time");
  const tail = preference ? [`Memoria: ${preference.text}. Se respeta al programar.`] : [];
  if (promise && promise.promisedDate >= date) {
    const reminderDay = addDays(promise.promisedDate, -1);
    if (date === reminderDay) {
      return {
        eligible: true,
        action: "reminder_only",
        reasons: [
          `Mañana vence la promesa del ${formatDate(promise.promisedDate)}: sólo se envía un recordatorio.`,
          ...tail,
        ],
        basis: preference ? "both" : "business_state",
      };
    }
    return {
      eligible: false,
      action: "wait",
      reasons: [
        `Hay una promesa activa para el ${formatDate(promise.promisedDate)}: no se contacta para cobrar antes de esa fecha.`,
      ],
      basis: "business_state",
    };
  }
  const lastPromise = world.promises.filter((p) => p.customerId === customerId).at(-1);
  return {
    eligible: true,
    action: "contact",
    reasons: [
      lastPromise?.status === "broken" ||
      (lastPromise?.status === "active" && lastPromise.promisedDate < date)
        ? `La promesa del ${formatDate(lastPromise.promisedDate)} venció sin pago: el cliente vuelve a ser elegible.`
        : `Tiene ${debt.overdueInstallments} cuota(s) vencida(s) y no hay promesas activas.`,
      ...tail,
    ],
    basis: preference ? "both" : "business_state",
  };
}

/** Marca como incumplidas las promesas activas cuya fecha ya pasó (lo que haría un job diario). */
export function expirePromises(world: CollectionsWorld, today: IsoDate): CollectionsWorld {
  const expired = world.promises.filter((p) => p.status === "active" && p.promisedDate < today);
  if (expired.length === 0) return world;
  const ids = new Set(expired.map((p) => p.id));
  return {
    ...world,
    promises: world.promises.map((p) => (ids.has(p.id) ? { ...p, status: "broken" as const } : p)),
    events: [
      ...world.events,
      ...expired.map((p, i) => ({
        id: `E-exp-${p.id}-${i}`,
        customerId: p.customerId,
        at: addDays(p.promisedDate, 1),
        type: "promise_broken",
        description: `La promesa ${p.id} venció sin pago.`,
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
  if (/\b(me quede sin trabajo|perdi (el|mi) trabajo|estoy desemplead[oa])\b/.test(text)) {
    facts.push({
      ...base,
      id: nextFactId(),
      kind: "context",
      topic: "employment",
      text: "Comentó que perdió el trabajo",
      expiresAt: null,
    });
  }
  return facts;
}

/** Hecho de compromiso derivado de una promesa registrada con éxito (lo confirma una herramienta). */
export function promiseFact(
  id: string,
  customerId: string,
  today: IsoDate,
  promisedDate: IsoDate,
  amount: string,
): MemoryFact {
  return {
    id,
    customerId,
    kind: "commitment",
    topic: "promise",
    text: `Prometió pagar ${amount} el ${formatDate(promisedDate)}`,
    observedAt: today,
    // Vence al terminar el día prometido: desde el día siguiente ya no describe un compromiso vigente.
    expiresAt: promisedDate,
    supersededBy: null,
  };
}
