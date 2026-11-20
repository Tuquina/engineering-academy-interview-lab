/** Índice de `target` en un array ordenado y rotado (valores distintos), o -1. Debe ser O(log n). */
export function searchRotated(nums: readonly number[], target: number): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    const value = nums[mid]!;
    if (value === target) return mid;
    const low = nums[lo]!;
    const high = nums[hi]!;
    if (low <= value) {
      // La mitad izquierda [lo, mid] está ordenada.
      if (low <= target && target < value) hi = mid - 1;
      else lo = mid + 1;
    } else {
      // La mitad derecha [mid, hi] está ordenada.
      if (value < target && target <= high) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
