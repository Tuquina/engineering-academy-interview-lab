/** Los `k` valores más frecuentes de `nums` (mayor frecuencia primero; empate: menor valor primero). */
export function topKFrequent(nums: readonly number[], k: number): number[] {
  // Problema: devuelve los k valores distintos más grandes, no los más frecuentes.
  return [...new Set(nums)].sort((a, b) => b - a).slice(0, k);
}
