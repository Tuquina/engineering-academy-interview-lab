import { topKFrequent } from "./solution";

test("devuelve los más frecuentes de mayor a menor", () => {
  expect(topKFrequent([1, 1, 1, 2, 2, 3], 2)).toEqual([1, 2]);
});

test("un solo elemento", () => {
  expect(topKFrequent([5], 1)).toEqual([5]);
});

test("funciona con negativos", () => {
  expect(topKFrequent([-1, -1, 2, 2, 2], 1)).toEqual([2]);
});
