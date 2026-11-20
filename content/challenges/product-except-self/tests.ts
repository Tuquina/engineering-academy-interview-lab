import { productExceptSelf } from "./solution";

// Multiplicar por cero un negativo da -0 en JavaScript; para el resultado, -0 y 0 son lo mismo.
const normalize = (values: number[]) => values.map((v) => (Object.is(v, -0) ? 0 : v));

test("calcula el producto del resto", () => {
  expect(productExceptSelf([1, 2, 3, 4])).toEqual([24, 12, 8, 6]);
});

test("funciona con dos elementos", () => {
  expect(productExceptSelf([2, 3])).toEqual([3, 2]);
});

test("funciona con un cero", () => {
  expect(normalize(productExceptSelf([-1, 1, 0, -3, 3]))).toEqual([0, 0, 9, 0, 0]);
});
