export type Throttled<A extends unknown[]> = ((...args: A) => void) & { cancel(): void };

/**
 * Devuelve una versión de `fn` que se ejecuta como máximo una vez cada `intervalMs`:
 * de inmediato en la primera llamada y, si hubo más llamadas en la ventana, una vez al final con los últimos argumentos.
 */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, intervalMs: number): Throttled<A> {
  let lastRun = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingArgs: A | null = null;

  const invoke = (args: A) => {
    lastRun = Date.now();
    fn(...args);
  };

  const throttled = (...args: A) => {
    const remaining = intervalMs - (Date.now() - lastRun);
    if (remaining <= 0 && timer === undefined) {
      invoke(args);
      return;
    }
    pendingArgs = args;
    timer ??= setTimeout(
      () => {
        timer = undefined;
        if (pendingArgs) {
          const next = pendingArgs;
          pendingArgs = null;
          invoke(next);
        }
      },
      Math.max(remaining, 0),
    );
  };

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pendingArgs = null;
  };

  return Object.assign(throttled, { cancel });
}
