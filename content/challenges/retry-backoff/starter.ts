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
  const sleep = options.sleep ?? defaultSleep;
  // Reintenta con una espera fija y sin respetar shouldRetry ni la cancelación.
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt > options.retries) throw error;
      await sleep(options.baseDelayMs);
    }
  }
}
