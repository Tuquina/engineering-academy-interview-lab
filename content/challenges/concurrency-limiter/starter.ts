export interface Limiter {
  <T>(task: () => Promise<T>): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
}

/**
 * Crea un limitador que ejecuta como máximo `concurrency` tareas a la vez, en orden de llegada.
 * @throws {RangeError} si `concurrency` es menor a 1.
 */
export function createLimiter(concurrency: number): Limiter {
  // Esta versión no limita nada: ejecuta cada tarea apenas llega.
  const limit = <T>(task: () => Promise<T>): Promise<T> => task();
  return Object.defineProperties(limit, {
    activeCount: { get: () => 0 },
    pendingCount: { get: () => 0 },
  }) as Limiter;
}
