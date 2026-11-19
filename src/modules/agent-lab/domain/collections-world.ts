/**
 * Mundo de negocio ficticio sobre el que operan las herramientas del AI Agents Lab (MASTER_PROMPT §16.4).
 *
 * Es el "sistema de registro" de una cobranza: clientes, préstamos, cuotas, pagos, promesas, contactos programados,
 * rechazos y escalamientos. Todas las operaciones son funciones puras sobre este estado inmutable, para poder mostrar
 * el estado anterior y posterior de cada llamada a una herramienta y repetir exactamente una ejecución.
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
  /** El cliente declaró que no reconoce la deuda (requiere un operador humano según la política). */
  readonly disputed: boolean;
}

export interface Installment {
  readonly id: string;
  readonly loanId: string;
  readonly number: number;
  readonly dueDate: IsoDate;
  readonly amountCents: number;
  readonly paidCents: number;
}

export interface Loan {
  readonly id: string;
  readonly customerId: string;
  readonly product: string;
  readonly principalCents: number;
}

export interface Payment {
  readonly id: string;
  readonly customerId: string;
  readonly reference: string;
  readonly amountCents: number;
  readonly receivedAt: IsoDate;
  /** `pending`: informado por el proveedor de pagos pero todavía no aplicado a las cuotas. */
  readonly status: "pending" | "applied";
}

export interface PaymentPromise {
  readonly id: string;
  readonly customerId: string;
  readonly amountCents: number;
  readonly promisedDate: IsoDate;
  readonly createdAt: IsoDate;
  readonly status: "active" | "kept" | "broken";
}

export interface ScheduledContact {
  readonly id: string;
  readonly customerId: string;
  readonly at: string;
  readonly channel: "call" | "whatsapp" | "sms";
  readonly reason: string;
}

export interface Refusal {
  readonly id: string;
  readonly customerId: string;
  readonly reason: RefusalReason;
  readonly notes: string;
  readonly at: IsoDate;
}

export type RefusalReason = "cannot_pay" | "does_not_recognize_debt" | "will_not_pay" | "do_not_contact";

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

export interface CollectionsWorld {
  readonly customers: readonly Customer[];
  readonly loans: readonly Loan[];
  readonly installments: readonly Installment[];
  readonly payments: readonly Payment[];
  readonly promises: readonly PaymentPromise[];
  readonly contacts: readonly ScheduledContact[];
  readonly refusals: readonly Refusal[];
  readonly escalations: readonly Escalation[];
  readonly events: readonly WorldEvent[];
}

/** Fecha "de hoy" por defecto del laboratorio: fija, para que las ejecuciones sean reproducibles. */
export const LAB_TODAY: IsoDate = "2026-03-05";

export const SEED_WORLD: CollectionsWorld = {
  customers: [
    {
      id: "c-001",
      name: "Lucía Fernández",
      phoneMasked: "+54 11 ****-1234",
      segment: "Mora temprana",
      doNotContact: false,
      disputed: false,
    },
    {
      id: "c-002",
      name: "Martín Gómez",
      phoneMasked: "+54 11 ****-5678",
      segment: "Mora tardía",
      doNotContact: false,
      disputed: false,
    },
    {
      id: "c-003",
      name: "Sofía Ramírez",
      phoneMasked: "+54 351 ****-9012",
      segment: "Mora temprana",
      doNotContact: false,
      disputed: false,
    },
    {
      id: "c-004",
      name: "Diego Torres",
      phoneMasked: "+54 261 ****-3456",
      segment: "En disputa",
      doNotContact: false,
      disputed: true,
    },
  ],
  loans: [
    { id: "L-1001", customerId: "c-001", product: "Préstamo personal", principalCents: 54_000_000 },
    { id: "L-1002", customerId: "c-002", product: "Préstamo personal", principalCents: 96_000_000 },
    { id: "L-1003", customerId: "c-003", product: "Tarjeta de crédito", principalCents: 18_000_000 },
    { id: "L-1004", customerId: "c-004", product: "Préstamo personal", principalCents: 36_000_000 },
  ],
  installments: [
    inst("L-1001", 3, "2026-01-20", 4_500_000, 4_500_000),
    inst("L-1001", 4, "2026-02-20", 4_500_000, 0),
    inst("L-1001", 5, "2026-03-20", 4_500_000, 0),
    inst("L-1002", 6, "2025-12-28", 8_000_000, 0),
    inst("L-1002", 7, "2026-01-28", 8_000_000, 0),
    inst("L-1002", 8, "2026-02-28", 8_000_000, 0),
    inst("L-1003", 2, "2026-02-25", 3_000_000, 0),
    inst("L-1003", 3, "2026-03-25", 3_000_000, 0),
    inst("L-1004", 1, "2026-01-15", 6_000_000, 0),
    inst("L-1004", 2, "2026-02-15", 6_000_000, 0),
  ],
  payments: [
    {
      id: "PAY-1",
      customerId: "c-001",
      reference: "TRX-55001",
      amountCents: 4_500_000,
      receivedAt: "2026-01-19",
      status: "applied",
    },
    {
      id: "PAY-2",
      customerId: "c-003",
      reference: "TRX-88123",
      amountCents: 3_000_000,
      receivedAt: "2026-03-04",
      status: "pending",
    },
  ],
  promises: [
    {
      id: "P-1",
      customerId: "c-002",
      amountCents: 8_000_000,
      promisedDate: "2026-02-10",
      createdAt: "2026-02-03",
      status: "broken",
    },
  ],
  contacts: [],
  refusals: [],
  escalations: [],
  events: [
    ev("E-1", "c-001", "2026-01-19", "payment_applied", "Pago TRX-55001 aplicado a la cuota 3."),
    ev(
      "E-2",
      "c-002",
      "2026-02-03",
      "promise_registered",
      "Promesa de pago por $80.000,00 para el 2026-02-10.",
    ),
    ev("E-3", "c-002", "2026-02-11", "promise_broken", "La promesa P-1 venció sin pago."),
    ev(
      "E-4",
      "c-003",
      "2026-03-04",
      "payment_reported",
      "El proveedor informó el pago TRX-88123 (pendiente).",
    ),
    ev("E-5", "c-004", "2026-02-20", "dispute_opened", "El cliente declaró no reconocer el préstamo L-1004."),
  ],
};

function inst(
  loanId: string,
  number: number,
  dueDate: IsoDate,
  amountCents: number,
  paidCents: number,
): Installment {
  return { id: `${loanId}-${number}`, loanId, number, dueDate, amountCents, paidCents };
}

function ev(id: string, customerId: string, at: IsoDate, type: string, description: string): WorldEvent {
  return { id, customerId, at, type, description };
}

// ---------------------------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------------------------

export function findCustomer(world: CollectionsWorld, customerId: string): Customer | undefined {
  return world.customers.find((c) => c.id === customerId);
}

export function customerInstallments(world: CollectionsWorld, customerId: string): Installment[] {
  const loanIds = new Set(world.loans.filter((l) => l.customerId === customerId).map((l) => l.id));
  return world.installments
    .filter((i) => loanIds.has(i.loanId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export interface DebtSummary {
  readonly overdueCents: number;
  readonly upcomingCents: number;
  readonly overdueInstallments: number;
  readonly oldestDueDate: IsoDate | null;
  readonly daysPastDue: number;
  readonly pendingPaymentsCents: number;
}

/** Deuda vencida (cuotas con vencimiento anterior a hoy y saldo) y próxima a vencer. */
export function debtSummary(world: CollectionsWorld, customerId: string, today: IsoDate): DebtSummary {
  const installments = customerInstallments(world, customerId);
  const open = installments.filter((i) => i.paidCents < i.amountCents);
  const overdue = open.filter((i) => i.dueDate < today);
  const upcoming = open.filter((i) => i.dueDate >= today);
  const oldest = overdue[0]?.dueDate ?? null;
  return {
    overdueCents: sum(overdue.map((i) => i.amountCents - i.paidCents)),
    upcomingCents: sum(upcoming.map((i) => i.amountCents - i.paidCents)),
    overdueInstallments: overdue.length,
    oldestDueDate: oldest,
    daysPastDue: oldest ? daysBetween(oldest, today) : 0,
    pendingPaymentsCents: sum(
      world.payments
        .filter((p) => p.customerId === customerId && p.status === "pending")
        .map((p) => p.amountCents),
    ),
  };
}

export function activePromise(world: CollectionsWorld, customerId: string): PaymentPromise | undefined {
  return world.promises.find((p) => p.customerId === customerId && p.status === "active");
}

/** Vista de un cliente con todo lo que le pertenece; es lo que se muestra como estado anterior y posterior. */
export interface CustomerSnapshot {
  readonly customer: Customer | null;
  readonly installments: readonly Installment[];
  readonly payments: readonly Payment[];
  readonly promises: readonly PaymentPromise[];
  readonly contacts: readonly ScheduledContact[];
  readonly refusals: readonly Refusal[];
  readonly escalations: readonly Escalation[];
}

export function customerSnapshot(world: CollectionsWorld, customerId: string): CustomerSnapshot {
  const own = <T extends { customerId: string }>(items: readonly T[]) =>
    items.filter((item) => item.customerId === customerId);
  return {
    customer: findCustomer(world, customerId) ?? null,
    installments: customerInstallments(world, customerId),
    payments: own(world.payments),
    promises: own(world.promises),
    contacts: own(world.contacts),
    refusals: own(world.refusals),
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
    ["cuotas", "installments"],
    ["pagos", "payments"],
    ["promesas", "promises"],
    ["contactos programados", "contacts"],
    ["rechazos", "refusals"],
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

/** Siguiente identificador secuencial para una colección (`P-2`, `ESC-1`…). */
export function nextId(prefix: string, items: readonly { id: string }[]): string {
  const numbers = items
    .map((item) => (item.id.startsWith(`${prefix}-`) ? Number(item.id.slice(prefix.length + 1)) : 0))
    .filter(Number.isFinite);
  return `${prefix}-${Math.max(0, ...numbers) + 1}`;
}
