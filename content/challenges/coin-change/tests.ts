import { coinChange } from "./solution";

test("combina monedas para el mínimo", () => {
  expect(coinChange([1, 2, 5], 11)).toBe(3);
});

test("devuelve -1 si el monto es imposible", () => {
  expect(coinChange([2], 3)).toBe(-1);
});

test("monto cero necesita cero monedas", () => {
  expect(coinChange([1], 0)).toBe(0);
});

test("el greedy no es óptimo con estas monedas", () => {
  expect(coinChange([1, 3, 4], 6)).toBe(2);
});
