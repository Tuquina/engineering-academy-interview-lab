export type Throttled<A extends unknown[]> = ((...args: A) => void) & { cancel(): void };

/**
 * Devuelve una versión de `fn` que se ejecuta como máximo una vez cada `intervalMs`:
 * de inmediato en la primera llamada y, si hubo más llamadas en la ventana, una vez al final con los últimos argumentos.
 */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, intervalMs: number): Throttled<A> {
  let lastRun = 0;
  const throttled = (...args: A) => {
    // Esta versión descarta las llamadas dentro de la ventana: se pierde el último estado.
    if (Date.now() - lastRun >= intervalMs) {
      lastRun = Date.now();
      fn(...args);
    }
  };
  throttled.cancel = () => {};
  return throttled;
}
