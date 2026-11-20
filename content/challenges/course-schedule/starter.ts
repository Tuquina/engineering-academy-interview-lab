/**
 * Orden en el que se pueden cursar las `n` materias respetando las correlativas (`[a, b]`: `b` antes que `a`),
 * o `null` si hay un ciclo.
 */
export function findOrder(n: number, prerequisites: readonly (readonly [number, number])[]): number[] | null {
  // Pista: algoritmo de Kahn (grados de entrada + cola).
  throw new Error("No implementado");
}
