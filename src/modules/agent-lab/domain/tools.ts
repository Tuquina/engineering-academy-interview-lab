import type { AgentPolicies, ToolName } from "./agent-config";
import {
  activeReturn,
  addDays,
  customerOrders,
  daysBetween,
  findCustomer,
  formatDate,
  formatMoney,
  isIsoDate,
  nextId,
  orderSummary,
  type ComplaintReason,
  type IsoDate,
  type SupportWorld,
  type WorldEvent,
} from "./support-world";

/**
 * Ejecución de las herramientas del agente sobre el mundo del soporte al cliente (MASTER_PROMPT §16.4).
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
  | { readonly ok: true; readonly result: Record<string, unknown>; readonly world: SupportWorld }
  | { readonly ok: false; readonly error: string; readonly code: ToolErrorCode };

export type ToolErrorCode = "not_found" | "forbidden" | "policy_violation" | "conflict";

export interface ToolArgs {
  get_order: { customerId: string };
  get_history: { customerId: string; limit?: number };
  schedule_return: { customerId: string; orderId: string; pickupDate: string };
  get_allowed_compensations: { customerId: string };
  confirm_payment: { customerId: string; reference: string };
  schedule_contact: {
    customerId: string;
    date: string;
    hour: number;
    channel: "call" | "whatsapp" | "sms";
    reason: string;
  };
  register_complaint: { customerId: string; reason: ComplaintReason; notes?: string };
  escalate_to_operator: { customerId: string; reason: string; priority: "normal" | "high"; summary: string };
}

type Executor<N extends ToolName> = (world: SupportWorld, args: ToolArgs[N], ctx: ToolContext) => ToolOutcome;

const fail = (code: ToolErrorCode, error: string): ToolOutcome => ({ ok: false, code, error });

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "pendiente de pago",
  paid: "pagado, preparando el envío",
  shipped: "en camino",
  delivered: "entregado",
};

function guardCustomer(world: SupportWorld, customerId: string, ctx: ToolContext): ToolOutcome | null {
  if (customerId !== ctx.sessionCustomerId) {
    return fail("forbidden", "Sólo se puede operar sobre el cliente de esta conversación.");
  }
  if (!findCustomer(world, customerId)) return fail("not_found", `No existe el cliente ${customerId}.`);
  return null;
}

function withEvent(world: SupportWorld, event: Omit<WorldEvent, "id">): SupportWorld {
  return { ...world, events: [...world.events, { ...event, id: nextId("E", world.events) }] };
}

const getOrder: Executor<"get_order"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const order = orderSummary(world, args.customerId, ctx.today, ctx.policies.returnWindowDays);
  if (!order) return { ok: true, world, result: { order: null } };
  const pending = activeReturn(world, args.customerId);
  return {
    ok: true,
    world,
    result: {
      orderId: order.orderId,
      description: order.description,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] ?? order.status,
      total: formatMoney(order.totalCents),
      carrier: order.carrier,
      promisedBy: order.promisedBy,
      deliveredAt: order.deliveredAt,
      daysLate: order.daysLate,
      returnDeadline: order.returnDeadline,
      pendingPaymentsCents: order.pendingPaymentsCents,
      activeReturn: pending ? { id: pending.id, pickupDate: pending.pickupDate } : null,
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

const scheduleReturn: Executor<"schedule_return"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const customer = findCustomer(world, args.customerId)!;
  if (customer.disputed && ctx.policies.escalateOnDispute) {
    return fail("policy_violation", "Hay un cargo no reconocido: la política exige escalar a un operador.");
  }
  const order = customerOrders(world, args.customerId).find(
    (o) => o.id === args.orderId.trim().toUpperCase(),
  );
  if (!order) return fail("not_found", `El pedido ${args.orderId} no pertenece a este cliente.`);
  if (order.status !== "delivered" || !order.deliveredAt) {
    return fail("conflict", "Sólo se pueden devolver pedidos entregados.");
  }
  const deadline = addDays(order.deliveredAt, ctx.policies.returnWindowDays);
  if (ctx.today > deadline) {
    return fail(
      "policy_violation",
      `El plazo de devolución venció el ${formatDate(deadline)} (${ctx.policies.returnWindowDays} días desde la entrega).`,
    );
  }
  if (!isIsoDate(args.pickupDate)) return fail("policy_violation", "La fecha debe tener formato AAAA-MM-DD.");
  const days = daysBetween(ctx.today, args.pickupDate);
  if (days < 1) return fail("policy_violation", "El retiro se programa desde mañana en adelante.");
  if (days > ctx.policies.maxPickupDays) {
    return fail(
      "policy_violation",
      `La política permite programar el retiro hasta ${ctx.policies.maxPickupDays} días desde hoy (hasta el ` +
        `${formatDate(addDays(ctx.today, ctx.policies.maxPickupDays))}).`,
    );
  }
  if (world.returns.some((r) => r.orderId === order.id && r.status === "scheduled")) {
    return fail("conflict", "Ya hay una devolución programada para este pedido: no se programa otra.");
  }
  const request = {
    id: nextId("R", world.returns),
    customerId: args.customerId,
    orderId: order.id,
    pickupDate: args.pickupDate,
    refundCents: order.totalCents,
    createdAt: ctx.today,
    status: "scheduled" as const,
  };
  const next = withEvent(
    { ...world, returns: [...world.returns, request] },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "return_scheduled",
      description: `Devolución ${request.id} del pedido ${order.id}: retiro el ${request.pickupDate}.`,
    },
  );
  return {
    ok: true,
    world: next,
    result: {
      returnId: request.id,
      orderId: order.id,
      pickupDate: request.pickupDate,
      refund: formatMoney(request.refundCents),
    },
  };
};

const getAllowedCompensations: Executor<"get_allowed_compensations"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const customer = findCustomer(world, args.customerId)!;
  if (customer.disputed && ctx.policies.escalateOnDispute) {
    return fail("policy_violation", "Hay un cargo no reconocido: no se ofrecen compensaciones.");
  }
  const order = orderSummary(world, args.customerId, ctx.today, ctx.policies.returnWindowDays);
  if (!order) return { ok: true, world, result: { compensations: [] } };
  const compensations: Record<string, unknown>[] = [];
  // Una demora habilita compensaciones; una demora larga, además, cancelar con reembolso total.
  if (order.status === "shipped" && order.daysLate > 0) {
    if (ctx.policies.maxCouponPercent > 0) {
      compensations.push({
        id: "coupon",
        description: `Cupón del ${ctx.policies.maxCouponPercent} % para tu próxima compra.`,
        percent: ctx.policies.maxCouponPercent,
      });
    }
    compensations.push({ id: "shipping_refund", description: "Reintegro del costo de envío." });
    if (order.daysLate > 7) {
      compensations.push({
        id: "cancel_refund",
        description: `Cancelar el pedido con reembolso total (${formatMoney(order.totalCents)}).`,
      });
    }
  }
  if (order.status === "delivered" && order.returnDeadline && ctx.today <= order.returnDeadline) {
    compensations.push({
      id: "return",
      description: `Devolución con retiro a domicilio, pidiéndola hasta el ${formatDate(order.returnDeadline)}.`,
    });
  }
  return { ok: true, world, result: { orderId: order.orderId, daysLate: order.daysLate, compensations } };
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
  // Aplica el pago: el pedido pendiente de pago pasa a pagado y entra en preparación.
  const next = withEvent(
    {
      ...world,
      payments: world.payments.map((p) => (p.id === payment.id ? { ...p, status: "applied" as const } : p)),
      orders: world.orders.map((o) =>
        o.id === payment.orderId && o.status === "pending_payment" ? { ...o, status: "paid" as const } : o,
      ),
    },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "payment_applied",
      description: `Pago ${payment.reference} por ${formatMoney(payment.amountCents)} aplicado al pedido ${payment.orderId}.`,
    },
  );
  return {
    ok: true,
    world: next,
    result: {
      found: true,
      applied: true,
      amount: formatMoney(payment.amountCents),
      orderId: payment.orderId,
      orderStatus: next.orders.find((o) => o.id === payment.orderId)?.status ?? null,
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

const registerComplaint: Executor<"register_complaint"> = (world, args, ctx) => {
  const denied = guardCustomer(world, args.customerId, ctx);
  if (denied) return denied;
  const complaint = {
    id: nextId("RC", world.complaints),
    customerId: args.customerId,
    reason: args.reason,
    notes: args.notes ?? "",
    at: ctx.today,
  };
  const optOut = args.reason === "do_not_contact";
  const next = withEvent(
    {
      ...world,
      complaints: [...world.complaints, complaint],
      customers: optOut
        ? world.customers.map((c) => (c.id === args.customerId ? { ...c, doNotContact: true } : c))
        : world.customers,
      contacts: optOut ? world.contacts.filter((c) => c.customerId !== args.customerId) : world.contacts,
    },
    {
      customerId: args.customerId,
      at: ctx.today,
      type: "complaint_registered",
      description: `Reclamo registrado (${args.reason}).`,
    },
  );
  return { ok: true, world: next, result: { complaintId: complaint.id, doNotContact: optOut } };
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
  return { ok: true, world: next, result: { escalationId: escalation.id, queue: "soporte-tienda" } };
};

const EXECUTORS: { [N in ToolName]: Executor<N> } = {
  get_order: getOrder,
  get_history: getHistory,
  schedule_return: scheduleReturn,
  get_allowed_compensations: getAllowedCompensations,
  confirm_payment: confirmPayment,
  schedule_contact: scheduleContact,
  register_complaint: registerComplaint,
  escalate_to_operator: escalate,
};

/** Herramientas que sólo leen: no cambian el mundo. */
export const READ_ONLY_TOOLS: ReadonlySet<ToolName> = new Set([
  "get_order",
  "get_history",
  "get_allowed_compensations",
]);

export function executeTool<N extends ToolName>(
  name: N,
  world: SupportWorld,
  args: ToolArgs[N],
  ctx: ToolContext,
): ToolOutcome {
  return (EXECUTORS[name] as Executor<N>)(world, args, ctx);
}
