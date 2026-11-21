/**
 * Mundo de negocio ficticio sobre el que operan las herramientas del AI Agents Lab (MASTER_PROMPT §16.4).
 *
 * Es el "sistema de registro" del soporte al cliente de un comercio electrónico: clientes, pedidos, pagos,
 * devoluciones con retiro a domicilio, contactos programados, reclamos y escalamientos. Todas las operaciones son
 * funciones puras sobre este estado inmutable, para poder mostrar el estado anterior y posterior de cada llamada a
 * una herramienta y repetir exactamente una ejecución.
 *
 * Las fechas de negocio son días calendario `YYYY-MM-DD`; los montos, enteros en centavos.
 */

export type IsoDate = string;

export interface Customer {
  readonly id: string;
  readonly name: string;
  /** Teléfono enmascarado: el laboratorio nunca muestra datos personales completos. */
  readonly phoneMasked: string;
  readonly segment: string;
  readonly doNotContact: boolean;
  /** El cliente declaró que no reconoce un cargo (posible fraude: requiere una persona según la política). */
  readonly disputed: boolean;
}

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "delivered";

export interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly description: string;
  readonly totalCents: number;
  readonly status: OrderStatus;
  readonly carrier: string;
  readonly placedAt: IsoDate;
  /** Fecha de entrega comprometida con el cliente. */
  readonly promisedBy: IsoDate;
  readonly deliveredAt: IsoDate | null;
}

export interface Payment {
  readonly id: string;
  readonly customerId: string;
  readonly orderId: string;
  readonly reference: string;
  readonly amountCents: number;
  readonly receivedAt: IsoDate;
  /** `pending`: informado por el proveedor de pagos pero todavía no aplicado al pedido. */
  readonly status: "pending" | "applied";
}

/** Devolución con retiro a domicilio: el transportista pasa a buscar el paquete el día acordado. */
export interface ReturnRequest {
  readonly id: string;
  readonly customerId: string;
  readonly orderId: string;
  readonly pickupDate: IsoDate;
  readonly refundCents: number;
  readonly createdAt: IsoDate;
  /** `missed`: el día del retiro pasó sin que el transportista retirara el paquete. */
  readonly status: "scheduled" | "picked_up" | "missed";
}

export interface ScheduledContact {
  readonly id: string;
  readonly customerId: string;
  readonly at: string;
  readonly channel: "call" | "whatsapp" | "sms";
  readonly reason: string;
}

export type ComplaintReason = "late_delivery" | "damaged_item" | "unrecognized_charge" | "do_not_contact";

export interface Complaint {
  readonly id: string;
  readonly customerId: string;
  readonly reason: ComplaintReason;
  readonly notes: string;
  readonly at: IsoDate;
}

export interface Escalation {
  readonly id: string;
  readonly customerId: string;
  readonly reason: string;
  readonly priority: "normal" | "high";
  readonly summary: string;
  readonly at: IsoDate;
}

/** Evento del historial: lo que pasó, en orden. Es la fuente para auditar y para la memoria de largo plazo. */
export interface WorldEvent {
  readonly id: string;
  readonly customerId: string;
  readonly at: IsoDate;
  readonly type: string;
  readonly description: string;
}

export interface SupportWorld {
  readonly customers: readonly Customer[];
  readonly orders: readonly Order[];
  readonly payments: readonly Payment[];
  readonly returns: readonly ReturnRequest[];
  readonly contacts: readonly ScheduledContact[];
  readonly complaints: readonly Complaint[];
  readonly escalations: readonly Escalation[];
  readonly events: readonly WorldEvent[];
}

/** Fecha "de hoy" por defecto del laboratorio: fija, para que las ejecuciones sean reproducibles. */
export const LAB_TODAY: IsoDate = "2026-03-05";

export const SEED_WORLD: SupportWorld = {
  customers: [
    {
      id: "c-001",
      name: "Lucía Fernández",
      phoneMasked: "+54 11 ****-1234",
      segment: "Envío demorado",
      doNotContact: false,
      disputed: false,
    },
    {
      id: "c-002",
      name: "Martín Gómez",
      phoneMasked: "+54 11 ****-5678",
      segment: "Pedido entregado",
      doNotContact: false,
      disputed: false,
    },
    {
      id: "c-003",
      name: "Sofía Ramírez",
      phoneMasked: "+54 351 ****-9012",
      segment: "Pago en proceso",
      doNotContact: false,
      disputed: false,
    },
    {
      id: "c-004",
      name: "Diego Torres",
      phoneMasked: "+54 261 ****-3456",
      segment: "Cargo no reconocido",
      doNotContact: false,
      disputed: true,
    },
  ],
  orders: [
    {
      id: "O-1001",
      customerId: "c-001",
      description: "Auriculares inalámbricos",
      totalCents: 4_500_000,
      status: "shipped",
      carrier: "Correo Rápido",
      placedAt: "2026-02-25",
      promisedBy: "2026-03-02",
      deliveredAt: null,
    },
    {
      id: "O-1002",
      customerId: "c-002",
      description: "Zapatillas de running",
      totalCents: 9_800_000,
      status: "delivered",
      carrier: "Envíos del Sur",
      placedAt: "2026-02-14",
      promisedBy: "2026-02-20",
      deliveredAt: "2026-02-20",
    },
    {
      id: "O-1003",
      customerId: "c-003",
      description: "Lámpara de pie",
      totalCents: 3_000_000,
      status: "pending_payment",
      carrier: "MotoExpress",
      placedAt: "2026-03-04",
      promisedBy: "2026-03-09",
      deliveredAt: null,
    },
    {
      id: "O-1004",
      customerId: "c-004",
      description: "Teclado mecánico",
      totalCents: 6_200_000,
      status: "paid",
      carrier: "Correo Rápido",
      placedAt: "2026-02-28",
      promisedBy: "2026-03-07",
      deliveredAt: null,
    },
  ],
  payments: [
    {
      id: "PAY-1",
      customerId: "c-002",
      orderId: "O-1002",
      reference: "TRX-55001",
      amountCents: 9_800_000,
      receivedAt: "2026-02-14",
      status: "applied",
    },
    {
      id: "PAY-2",
      customerId: "c-003",
      orderId: "O-1003",
      reference: "TRX-88123",
      amountCents: 3_000_000,
      receivedAt: "2026-03-04",
      status: "pending",
    },
    {
      id: "PAY-3",
      customerId: "c-001",
      orderId: "O-1001",
      reference: "TRX-60210",
      amountCents: 4_500_000,
      receivedAt: "2026-02-25",
      status: "applied",
    },
    {
      id: "PAY-4",
      customerId: "c-004",
      orderId: "O-1004",
      reference: "TRX-70555",
      amountCents: 6_200_000,
      receivedAt: "2026-02-28",
      status: "applied",
    },
  ],
  returns: [],
  contacts: [],
  complaints: [],
  escalations: [],
  events: [
    ev("E-1", "c-001", "2026-02-26", "order_shipped", "Pedido O-1001 despachado con Correo Rápido."),
    ev("E-2", "c-002", "2026-02-20", "order_delivered", "Pedido O-1002 entregado."),
    ev(
      "E-3",
      "c-003",
      "2026-03-04",
      "payment_reported",
      "El proveedor informó el pago TRX-88123 (pendiente).",
    ),
    ev(
      "E-4",
      "c-004",
      "2026-03-01",
      "charge_disputed",
      "El cliente declaró no reconocer el cargo del pedido O-1004.",
    ),
  ],
};

function ev(id: string, customerId: string, at: IsoDate, type: string, description: string): WorldEvent {
  return { id, customerId, at, type, description };
}

// ---------------------------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------------------------

export function findCustomer(world: SupportWorld, customerId: string): Customer | undefined {
  return world.customers.find((c) => c.id === customerId);
}

/** Pedidos del cliente, del más reciente al más antiguo. */
export function customerOrders(world: SupportWorld, customerId: string): Order[] {
  return world.orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export interface OrderSummary {
  readonly orderId: string;
  readonly description: string;
  readonly status: OrderStatus;
  readonly totalCents: number;
  readonly carrier: string;
  readonly promisedBy: IsoDate;
  readonly deliveredAt: IsoDate | null;
  /** Días de demora respecto de la fecha comprometida (0 si llegó a tiempo o todavía está en plazo). */
  readonly daysLate: number;
  /** Último día para pedir una devolución (sólo pedidos entregados). */
  readonly returnDeadline: IsoDate | null;
  readonly pendingPaymentsCents: number;
}

/** Estado del pedido más reciente del cliente: demora, plazo de devolución y pagos en proceso. */
export function orderSummary(
  world: SupportWorld,
  customerId: string,
  today: IsoDate,
  returnWindowDays: number,
): OrderSummary | null {
  const order = customerOrders(world, customerId)[0];
  if (!order) return null;
  const reference = order.deliveredAt ?? today;
  return {
    orderId: order.id,
    description: order.description,
    status: order.status,
    totalCents: order.totalCents,
    carrier: order.carrier,
    promisedBy: order.promisedBy,
    deliveredAt: order.deliveredAt,
    daysLate: Math.max(0, daysBetween(order.promisedBy, reference)),
    returnDeadline: order.deliveredAt ? addDays(order.deliveredAt, returnWindowDays) : null,
    pendingPaymentsCents: sum(
      world.payments
        .filter((p) => p.orderId === order.id && p.status === "pending")
        .map((p) => p.amountCents),
    ),
  };
}

/** Devolución con retiro programado (todavía no retirada) del cliente, si existe. */
export function activeReturn(world: SupportWorld, customerId: string): ReturnRequest | undefined {
  return world.returns.find((r) => r.customerId === customerId && r.status === "scheduled");
}

/** Vista de un cliente con todo lo que le pertenece; es lo que se muestra como estado anterior y posterior. */
export interface CustomerSnapshot {
  readonly customer: Customer | null;
  readonly orders: readonly Order[];
  readonly payments: readonly Payment[];
  readonly returns: readonly ReturnRequest[];
  readonly contacts: readonly ScheduledContact[];
  readonly complaints: readonly Complaint[];
  readonly escalations: readonly Escalation[];
}

export function customerSnapshot(world: SupportWorld, customerId: string): CustomerSnapshot {
  const own = <T extends { customerId: string }>(items: readonly T[]) =>
    items.filter((item) => item.customerId === customerId);
  return {
    customer: findCustomer(world, customerId) ?? null,
    orders: customerOrders(world, customerId),
    payments: own(world.payments),
    returns: own(world.returns),
    contacts: own(world.contacts),
    complaints: own(world.complaints),
    escalations: own(world.escalations),
  };
}

/**
 * Cambios legibles entre dos estados para un cliente: registros agregados y campos modificados.
 * Compara por `id`, que en este mundo es estable.
 */
export function describeChanges(before: CustomerSnapshot, after: CustomerSnapshot): string[] {
  const changes: string[] = [];
  const collections = [
    ["pedidos", "orders"],
    ["pagos", "payments"],
    ["devoluciones", "returns"],
    ["contactos programados", "contacts"],
    ["reclamos", "complaints"],
    ["escalamientos", "escalations"],
  ] as const;
  for (const [label, key] of collections) {
    const previous = new Map<string, unknown>(before[key].map((item) => [item.id, item]));
    for (const item of after[key]) {
      const old = previous.get(item.id);
      if (!old) changes.push(`${label}: se agregó ${item.id}`);
      else changes.push(...fieldChanges(`${label} ${item.id}`, old, item));
    }
  }
  if (before.customer && after.customer) {
    changes.push(...fieldChanges("cliente", before.customer, after.customer));
  }
  return changes;
}

function fieldChanges(label: string, before: unknown, after: unknown): string[] {
  if (before === after) return [];
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  return Object.keys(b)
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .map((key) => `${label}: ${key} ${JSON.stringify(a[key])} → ${JSON.stringify(b[key])}`);
}

// ---------------------------------------------------------------------------------------------------------------
// Utilidades de fechas y montos
// ---------------------------------------------------------------------------------------------------------------

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const DAY_MS = 86_400_000;

function toUtc(date: IsoDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(toUtc(value)).toISOString().slice(0, 10) === value;
}

const MONEY = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(cents: number): string {
  return `$${MONEY.format(cents / 100)}`;
}

/** `2026-03-15` → `15/03/2026`. */
export function formatDate(date: IsoDate): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** Siguiente identificador secuencial para una colección (`R-2`, `ESC-1`…). */
export function nextId(prefix: string, items: readonly { id: string }[]): string {
  const numbers = items
    .map((item) => (item.id.startsWith(`${prefix}-`) ? Number(item.id.slice(prefix.length + 1)) : 0))
    .filter(Number.isFinite);
  return `${prefix}-${Math.max(0, ...numbers) + 1}`;
}
