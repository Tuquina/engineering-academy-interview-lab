import { searchRotated } from "./solution";

test("encuentra un valor en la parte rotada", () => {
  expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 0)).toBe(4);
});

test("encuentra un valor en la parte inicial", () => {
  expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 5)).toBe(1);
});

test("devuelve -1 si no está", () => {
  expect(searchRotated([4, 5, 6, 7, 0, 1, 2], 3)).toBe(-1);
});

test("un solo elemento", () => {
  expect(searchRotated([1], 1)).toBe(0);
  expect(searchRotated([1], 2)).toBe(-1);
});
