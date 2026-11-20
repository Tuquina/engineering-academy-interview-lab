/** `result[i]` es el producto de todos los elementos de `nums` menos `nums[i]`, sin usar la división. */
export function productExceptSelf(nums: readonly number[]): number[] {
  const result = new Array<number>(nums.length);
  // Pasada 1: result[i] = producto de todo lo que está a la izquierda de i.
  let prefix = 1;
  for (let i = 0; i < nums.length; i++) {
    result[i] = prefix;
    prefix *= nums[i]!;
  }
  // Pasada 2: multiplica por el producto de todo lo que está a la derecha de i.
  let suffix = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    result[i] = result[i]! * suffix;
    suffix *= nums[i]!;
  }
  return result;
}
