export type Debounced<A extends unknown[]> = ((...args: A) => void) & { cancel(): void };

/**
 * Devuelve una versión de `fn` que sólo se ejecuta cuando pasan `waitMs` milisegundos sin nuevas llamadas.
 * Se ejecuta con los argumentos de la última llamada. `cancel()` descarta la ejecución pendiente.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  const debounced = (...args: A) => {
    // Implementación ingenua: ejecuta en cada llamada. Corregila para que agrupe las ráfagas.
    fn(...args);
  };
  debounced.cancel = () => {};
  return debounced;
}
