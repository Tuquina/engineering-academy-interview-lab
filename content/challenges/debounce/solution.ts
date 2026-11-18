export type Debounced<A extends unknown[]> = ((...args: A) => void) & { cancel(): void };

/**
 * Devuelve una versión de `fn` que sólo se ejecuta cuando pasan `waitMs` milisegundos sin nuevas llamadas.
 * Se ejecuta con los argumentos de la última llamada. `cancel()` descarta la ejecución pendiente.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const debounced = (...args: A) => {
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  };

  return Object.assign(debounced, { cancel });
}
