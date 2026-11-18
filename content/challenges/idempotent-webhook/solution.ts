export interface PaymentEvent {
  eventId: string;
  debtId: string;
  amountCents: number;
}

export interface EventStore {
  wasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export interface Ledger {
  applyPayment(debtId: string, amountCents: number): Promise<void>;
}

export type WebhookResponse =
  | { status: 200; body: { processed: true } | { processed: false; duplicate: true } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Valida el payload en el límite del sistema: lo externo llega como `unknown`. */
function parsePaymentEvent(payload: unknown): PaymentEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const candidate = payload as Record<string, unknown>;
  const { eventId, debtId, amountCents } = candidate;
  if (!isNonEmptyString(eventId) || !isNonEmptyString(debtId)) return null;
  if (typeof amountCents !== "number" || !Number.isInteger(amountCents) || amountCents <= 0) return null;
  return { eventId, debtId, amountCents };
}

/**
 * Crea el handler del webhook de pagos.
 * Debe validar el payload, aplicar cada evento una sola vez y permitir reintentos si el procesamiento falla.
 */
export function createPaymentWebhookHandler(deps: { store: EventStore; ledger: Ledger }) {
  /** Procesamientos en curso por eventId: las entregas simultáneas comparten la misma promesa. */
  const inFlight = new Map<string, Promise<"processed" | "duplicate">>();

  const process = async (event: PaymentEvent): Promise<"processed" | "duplicate"> => {
    if (await deps.store.wasProcessed(event.eventId)) return "duplicate";
    await deps.ledger.applyPayment(event.debtId, event.amountCents);
    await deps.store.markProcessed(event.eventId);
    return "processed";
  };

  return async (payload: unknown): Promise<WebhookResponse> => {
    const event = parsePaymentEvent(payload);
    if (!event) return { status: 400, body: { error: "invalid_payload" } };

    const existing = inFlight.get(event.eventId);
    if (existing) {
      // Otra entrega del mismo evento está en curso: esperamos su resultado y lo informamos como duplicado.
      try {
        await existing;
        return { status: 200, body: { processed: false, duplicate: true } };
      } catch {
        return { status: 500, body: { error: "processing_failed" } };
      }
    }

    const running = process(event);
    inFlight.set(event.eventId, running);
    try {
      const outcome = await running;
      return outcome === "processed"
        ? { status: 200, body: { processed: true } }
        : { status: 200, body: { processed: false, duplicate: true } };
    } catch {
      // No se marcó como procesado: el proveedor reintentará y podrá aplicarse.
      return { status: 500, body: { error: "processing_failed" } };
    } finally {
      inFlight.delete(event.eventId);
    }
  };
}
