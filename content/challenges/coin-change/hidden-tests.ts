import { coinChange } from "./solution";

test(
  "greedy fallaría también al decidir que es imposible",
  () => {
    // El greedy toma 5 y queda 1 sin solución; el óptimo es 3 + 3.
    expect(coinChange([3, 5], 6)).toBe(2);
  },
  { category: "edge-cases" },
);

test(
  "monedas desordenadas y repetidas",
  () => {
    expect(coinChange([5, 1, 5, 2], 7)).toBe(2);
  },
  { category: "edge-cases" },
);

test(
  "monedas más grandes que el monto",
  () => {
    expect(coinChange([10, 20], 5)).toBe(-1);
  },
  { category: "edge-cases" },
);

test(
  "monto 10.000 con varias monedas",
  () => {
    // 188 × 53 + 29 + 7 = 10.000. Con 189 monedas impares la suma sería impar: 190 es el mínimo.
    expect(coinChange([7, 13, 29, 41, 53], 10_000)).toBe(190);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
