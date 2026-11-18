export interface Limiter {
  <T>(task: () => Promise<T>): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
}

interface QueuedTask {
  run: () => void;
}

/**
 * Crea un limitador que ejecuta como máximo `concurrency` tareas a la vez, en orden de llegada.
 * @throws {RangeError} si `concurrency` es menor a 1.
 */
export function createLimiter(concurrency: number): Limiter {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(`concurrency debe ser un entero >= 1 (recibido: ${concurrency})`);
  }
  const queue: QueuedTask[] = [];
  let active = 0;

  const next = () => {
    if (active >= concurrency) return;
    const item = queue.shift();
    if (!item) return;
    active++;
    item.run();
  };

  const limit = <T>(task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push({
        run: () => {
          // Promise.resolve().then(task) convierte también los errores síncronos en rechazos.
          Promise.resolve()
            .then(task)
            .then(resolve, reject)
            .finally(() => {
              active--;
              next();
            });
        },
      });
      next();
    });

  return Object.defineProperties(limit, {
    activeCount: { get: () => active },
    pendingCount: { get: () => queue.length },
  }) as Limiter;
}
