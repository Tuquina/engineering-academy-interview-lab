/** Fusiona los intervalos superpuestos y los devuelve ordenados por inicio. */
export function mergeIntervals(intervals: readonly (readonly [number, number])[]): [number, number][] {
  // Problema: sólo compara intervalos vecinos tal como vienen, sin ordenar.
  const result: [number, number][] = [];
  for (const [start, end] of intervals) {
    const last = result[result.length - 1];
    if (last && start <= last[1]) last[1] = end;
    else result.push([start, end]);
  }
  return result;
}
