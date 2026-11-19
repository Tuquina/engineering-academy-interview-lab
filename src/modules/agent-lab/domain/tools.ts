import type { AgentPolicies, ToolName } from "./agent-config";
import {
  activePromise,
  addDays,
  customerInstallments,
  daysBetween,
  debtSummary,
  findCustomer,
  formatDate,
  formatMoney,
  isIsoDate,
  nextId,
  type CollectionsWorld,
  type IsoDate,
  type RefusalReason,
  type WorldEvent,
} from "./collections-world";

/**
 * Ejecución de las herramientas del agente sobre el mundo de cobranzas (MASTER_PROMPT §16.4).
 *
 * Cada herramienta es una función pura `(mundo, argumentos, contexto) → resultado`. Los argumentos ya llegan
 * validados por esquema (capa de aplicación); acá se aplican las **reglas de negocio y las políticas**, que no
 * dependen de que el modelo las respete.
 */

export interface ToolContext {
  readonly today: IsoDate;
  readonly policies: AgentPolicies;
  /** Cliente de la conversación: una herramienta nunca opera sobre otro (seguridad de herramientas). */
  readonly sessionCustomerId: string;
}

export type ToolOutcome =
  | { readonly ok: true; readonly result: Record<string, unknown>; readonly world: CollectionsWorld }
  | { readonly ok: false; readonly error: string; readonly code: ToolErrorCode };

export type ToolErrorCode = "not_found" | "forbidden" | "policy_violation" | "conflict";

export interface ToolArgs {
  get_debt: { customerId: string };
  get_history: { customerId: string; limit?: number };
  register_payment_promise: { customerId: string; amountCents: number; promisedDate: string };
  get_allowed_offers: { customerId: string };
  confirm_payment: { customerId: string; reference: string };
  schedule_contact: {
    customerId: string;
    date: string;
    hour: number;
    channel: "call" | "whatsapp" | "sms";
    reason: string;
  };
  register_refusal: { customerId: string; reason: RefusalReason; notes?: string };
  escalate_to_operator: { customerId: string; reason: string; priority: "normal" | "high"; summary: string };
}

type Executor<N extends ToolName> = (
  world: CollectionsWorld,
  args: ToolArgs[N],
  ctx: ToolContext,
) => ToolOutcome;

const fail = (code: ToolErrorCode, error: string): ToolOutcome => ({ ok: false, code, error });

function guardCustomer(world: CollectionsWorld, customerId: string, ctx: ToolContext): ToolOutcome | null {
  if (customerId !== ctx.sessionCustomerId) {
    return fail("forbidden", "Sólo se puede operar sobre el cliente de esta conversación.");
  }
  if (!findCustomer(world, customerId)) return fail("not_found", `No existe el cliente ${customerId}.`);
  return null;
}

function withEvent(world: CollectionsWorld, event: Omit<WorldEvent, "id">): CollectionsWorld {
  return { ...world, events: [...world.events, { ...event, id: nextId("E", world.events) }] };
}

const getDebt: Executor<"get_debt"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const debt = debtSummary(world, args.customerId, ctx.today);
  const promise = activePromise(world, args.customerId);
  return {
    ok: true,
    world,
    result: {
      overdueCents: debt.overdueCents,
      overdue: formatMoney(debt.overdueCents),
      overdueInstallments: debt.overdueInstallments,
      daysPastDue: debt.daysPastDue,
      upcomingCents: debt.upcomingCents,
      pendingPaymentsCents: debt.pendingPaymentsCents,
      activePromise: promise
        ? { id: promise.id, amount: formatMoney(promise.amountCents), date: promise.promisedDate }
        : null,
    },
  };
};

const getHistory: Executor<"get_history"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const events = world.events
    .filter((e) => e.customerId === args.customerId)
    .slice(-(args.limit ?? 10))
    .map(({ at, type, description }) => ({ at, type, description }));
  return { ok: true, world, result: { events } };
};

const registerPromise: Executor<"register_payment_promise"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const customer = findCustomer(world, args.customerId)!;
  if (customer.disputed && ctx.policies.escalateOnDispute) {
    return fail("policy_violation", "La deuda está en disputa: la política exige escalar a un operador.");
  }
  if (!isIsoDate(args.promisedDate))
    return fail("policy_violation", "La fecha debe tener formato AAAA-MM-DD.");
  const days = daysBetween(ctx.today, args.promisedDate);
  if (days < 0) return fail("policy_violation", "La fecha de la promesa no puede ser anterior a hoy.");
  if (days > ctx.policies.maxPromiseDays) {
    return fail(
      "policy_violation",
      `La política permite promesas hasta ${ctx.policies.maxPromiseDays} días (hasta el ` +
        `${formatDate(addDays(ctx.today, ctx.policies.maxPromiseDays))}).`,
    );
  }
  const debt = debtSummary(world, args.customerId, ctx.today);
  if (debt.overdueCents === 0) return fail("conflict", "El cliente no tiene deuda vencida.");
  if (args.amountCents < debt.overdueCents) {
    return fail(
      "policy_violation",
      `La promesa debe cubrir al menos la deuda vencida (${formatMoney(debt.overdueCents)}). ` +
        "Para montos menores, ofrecé un plan con get_allowed_offers.",
    );
  }
  if (args.amountCents > debt.overdueCents + debt.upcomingCents) {
    return fail("policy_violation", "El monto supera la deuda total.");
  }
  if (activePromise(world, args.customerId)) {
    return fail("conflict", "Ya existe una promesa activa: no se registra otra.");
  }
  const promise = {
    id: nextId("P", world.promises),
    customerId: args.customerId,
    amountCents: args.amountCents,
    promisedDate: args.promisedDate,
    createdAt: ctx.today,
    status: "active" as const,
  };
  const next = withEvent(
    { ...world, promises: [...world.promises, promise] },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "promise_registered",
      description: `Promesa ${promise.id} por ${formatMoney(promise.amountCents)} para el ${promise.promisedDate}.`,
    },
  );
  return {
    ok: true,
    world: next,
    result: { promiseId: promise.id, amount: formatMoney(promise.amountCents), date: promise.promisedDate },
  };
};

const getAllowedOffers: Executor<"get_allowed_offers"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const customer = findCustomer(world, args.customerId)!;
  if (customer.disputed && ctx.policies.escalateOnDispute) {
    return fail("policy_violation", "La deuda está en disputa: no se ofrecen propuestas.");
  }
  const debt = debtSummary(world, args.customerId, ctx.today);
  if (debt.overdueCents === 0) return { ok: true, world, result: { offers: [] } };
  const offers: Record<string, unknown>[] = [
    {
      id: "full_payment",
      description: `Pago total de lo vencido (${formatMoney(debt.overdueCents)}) en hasta ${ctx.policies.maxPromiseDays} días.`,
    },
  ];
  // Planes y descuentos sólo con más de 30 días de atraso: antes se espera el pago de lo vencido.
  if (debt.daysPastDue > 30) {
    const installments = Math.min(ctx.policies.maxInstallments, 6);
    const each = Math.ceil(debt.overdueCents / installments);
    offers.push({
      id: "installment_plan",
      description: `Plan de ${installments} cuotas de ${formatMoney(each)}.`,
      installments,
      installmentCents: each,
    });
    if (ctx.policies.maxDiscountPercent > 0) {
      offers.push({
        id: "discount",
        description: `Descuento de hasta ${ctx.policies.maxDiscountPercent} % sobre intereses pagando lo vencido en un pago.`,
      });
    }
  }
  return { ok: true, world, result: { daysPastDue: debt.daysPastDue, offers } };
};

const confirmPayment: Executor<"confirm_payment"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const reference = args.reference.trim().toUpperCase();
  const payment = world.payments.find((p) => p.customerId === args.customerId && p.reference === reference);
  if (!payment) {
    return {
      ok: true,
      world,
      result: { found: false, reference, message: "No hay un pago con esa referencia." },
    };
  }
  if (payment.status === "applied") {
    return {
      ok: true,
      world,
      result: { found: true, alreadyApplied: true, amount: formatMoney(payment.amountCents) },
    };
  }
  // Aplica el pago a las cuotas abiertas, de la más antigua a la más nueva.
  let remaining = payment.amountCents;
  const touched = new Set(customerInstallments(world, args.customerId).map((i) => i.id));
  const installments = world.installments.map((i) => {
    if (!touched.has(i.id) || remaining === 0 || i.paidCents >= i.amountCents) return i;
    const applied = Math.min(remaining, i.amountCents - i.paidCents);
    remaining -= applied;
    return { ...i, paidCents: i.paidCents + applied };
  });
  const promise = activePromise(world, args.customerId);
  const promises = promise
    ? world.promises.map((p) => (p.id === promise.id ? { ...p, status: "kept" as const } : p))
    : world.promises;
  const next = withEvent(
    {
      ...world,
      installments,
      promises,
      payments: world.payments.map((p) => (p.id === payment.id ? { ...p, status: "applied" as const } : p)),
    },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "payment_applied",
      description: `Pago ${payment.reference} por ${formatMoney(payment.amountCents)} aplicado.`,
    },
  );
  return {
    ok: true,
    world: next,
    result: {
      found: true,
      applied: true,
      amount: formatMoney(payment.amountCents),
      remainingOverdue: formatMoney(debtSummary(next, args.customerId, ctx.today).overdueCents),
    },
  };
};

const scheduleContact: Executor<"schedule_contact"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const customer = findCustomer(world, args.customerId)!;
  if (customer.doNotContact) return fail("policy_violation", "El cliente pidió no ser contactado.");
  if (!isIsoDate(args.date) || args.date < ctx.today) {
    return fail("policy_violation", "La fecha debe ser hoy o posterior, con formato AAAA-MM-DD.");
  }
  const { contactHourStart: start, contactHourEnd: end } = ctx.policies;
  if (args.hour < start || args.hour >= end) {
    return fail("policy_violation", `Sólo se puede contactar entre las ${start} y las ${end} h.`);
  }
  const contact = {
    id: nextId("CT", world.contacts),
    customerId: args.customerId,
    at: `${args.date} ${String(args.hour).padStart(2, "0")}:00`,
    channel: args.channel,
    reason: args.reason,
  };
  const next = withEvent(
    { ...world, contacts: [...world.contacts, contact] },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "contact_scheduled",
      description: `Contacto por ${args.channel} programado para ${contact.at}.`,
    },
  );
  return {
    ok: true,
    world: next,
    result: { contactId: contact.id, at: contact.at, channel: contact.channel },
  };
};

const registerRefusal: Executor<"register_refusal"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const refusal = {
    id: nextId("R", world.refusals),
    customerId: args.customerId,
    reason: args.reason,
    notes: args.notes ?? "",
    at: ctx.today,
  };
  const optOut = args.reason === "do_not_contact";
  const next = withEvent(
    {
      ...world,
      refusals: [...world.refusals, refusal],
      customers: optOut
        ? world.customers.map((c) => (c.id === args.customerId ? { ...c, doNotContact: true } : c))
        : world.customers,
      contacts: optOut ? world.contacts.filter((c) => c.customerId !== args.customerId) : world.contacts,
    },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "refusal_registered",
      description: `Rechazo registrado (${args.reason}).`,
    },
  );
  return { ok: true, world: next, result: { refusalId: refusal.id, doNotContact: optOut } };
};

const escalate: Executor<"escalate_to_operator"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  if (world.escalations.some((e) => e.customerId === args.customerId && e.at === ctx.today)) {
    return fail("conflict", "Ya hay un escalamiento abierto hoy para este cliente.");
  }
  const escalation = {
    id: nextId("ESC", world.escalations),
    customerId: args.customerId,
    reason: args.reason,
    priority: args.priority,
    summary: args.summary,
    at: ctx.today,
  };
  const next = withEvent(
    { ...world, escalations: [...world.escalations, escalation] },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "escalated",
      description: `Escalado a un operador (${args.priority}): ${args.reason}.`,
    },
  );
  return { ok: true, world: next, result: { escalationId: escalation.id, queue: "operadores-cobranzas" } };
};

const EXECUTORS: { [N in ToolName]: Executor<N> } = {
  get_debt: getDebt,
  get_history: getHistory,
  register_payment_promise: registerPromise,
  get_allowed_offers: getAllowedOffers,
  confirm_payment: confirmPayment,
  schedule_contact: scheduleContact,
  register_refusal: registerRefusal,
  escalate_to_operator: escalate,
};

/** Herramientas que sólo leen: no cambian el mundo. */
export const READ_ONLY_TOOLS: ReadonlySet<ToolName> = new Set([
  "get_debt",
  "get_history",
  "get_allowed_offers",
]);

export function executeTool<N extends ToolName>(
  name: N,
  world: CollectionsWorld,
  args: ToolArgs[N],
  ctx: ToolContext,
): ToolOutcome {
  return (EXECUTORS[name] as Executor<N>)(world, args, ctx);
}
