/** `result[i]` es el producto de todos los elementos de `nums` menos `nums[i]`, sin usar la división. */
export function productExceptSelf(nums: readonly number[]): number[] {
  // Problema: usa la división (prohibida) y falla con ceros (0 / 0 = NaN).
  const total = nums.reduce((acc, n) => acc * n, 1);
  return nums.map((n) => total / n);
}
