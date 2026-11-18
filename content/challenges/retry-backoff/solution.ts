export interface RetryOptions {
  /** Reintentos además del primer intento. */
  retries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Ejecuta `operation` y la reintenta con backoff exponencial si falla.
 * @returns el resultado del primer intento exitoso.
 * @throws el último error si se agotan los intentos, o el motivo del abort si se cancela.
 */
export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { retries, baseDelayMs, maxDelayMs = Number.POSITIVE_INFINITY, signal } = options;
  const shouldRetry = options.shouldRetry ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await operation(attempt);
    } catch (error) {
      const isLastAttempt = attempt > retries;
      if (isLastAttempt || !shouldRetry(error)) throw error;
      signal?.throwIfAborted();
      await sleep(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
}
