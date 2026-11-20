import { twoSum } from "./solution";

test(
  "devuelve los índices en orden ascendente aunque el complemento aparezca antes",
  () => {
    expect(twoSum([10, 5, -3, 8], 2)).toEqual([1, 2]);
  },
  { category: "edge-cases" },
);

test(
  "con valores repetidos elige los índices correctos",
  () => {
    expect(twoSum([1, 5, 1, 5], 10)).toEqual([1, 3]);
  },
  { category: "edge-cases" },
);

test(
  "resuelve 100.000 elementos en tiempo lineal",
  () => {
    const n = 100_000;
    const nums = Array.from({ length: n }, (_, i) => i * 2);
    // El único par que suma un número impar grande involucra al último elemento.
    nums[n - 1] = 1;
    expect(twoSum(nums, 1 + (n - 2) * 2)).toEqual([n - 2, n - 1]);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
