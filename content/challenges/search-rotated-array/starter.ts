/** Índice de `target` en un array ordenado y rotado (valores distintos), o -1. Debe ser O(log n). */
export function searchRotated(nums: readonly number[], target: number): number {
  // Problema: búsqueda binaria común; falla cuando la rotación deja el objetivo "del otro lado".
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[mid]! < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
