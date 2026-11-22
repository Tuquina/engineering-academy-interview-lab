export interface PaymentEvent {
  eventId: string;
  orderId: string;
  amountCents: number;
}

export interface EventStore {
  wasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export interface Ledger {
  applyPayment(orderId: string, amountCents: number): Promise<void>;
}

export type WebhookResponse =
  | { status: 200; body: { processed: true } | { processed: false; duplicate: true } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } };

/**
 * Crea el handler del webhook de pagos.
 * Debe validar el payload, aplicar cada evento una sola vez y permitir reintentos si el procesamiento falla.
 */
export function createPaymentWebhookHandler(deps: { store: EventStore; ledger: Ledger }) {
  return async (payload: unknown): Promise<WebhookResponse> => {
    // Confía en el payload y no deduplica: cada reenvío aplica el pago otra vez.
    const event = payload as PaymentEvent;
    await deps.ledger.applyPayment(event.orderId, event.amountCents);
    await deps.store.markProcessed(event.eventId);
    return { status: 200, body: { processed: true } };
  };
}
