import { twoSum } from "./solution";

test("encuentra el par en el ejemplo básico", () => {
  expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
});

test("el par no tiene por qué estar al principio", () => {
  expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
});

test("no usa el mismo elemento dos veces", () => {
  expect(twoSum([3, 3], 6)).toEqual([0, 1]);
});

test("funciona con negativos y ceros", () => {
  expect(twoSum([-4, 1, 9, 0], -4)).toEqual([0, 3]);
});
