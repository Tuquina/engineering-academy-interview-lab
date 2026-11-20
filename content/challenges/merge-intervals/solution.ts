/** Fusiona los intervalos superpuestos y los devuelve ordenados por inicio. */
export function mergeIntervals(intervals: readonly (readonly [number, number])[]): [number, number][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]); // copia: no mutar la entrada
  const result: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = result[result.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end); // el actual puede estar contenido en el último
    } else {
      result.push([start, end]);
    }
  }
  return result;
}
