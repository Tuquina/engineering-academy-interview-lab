import { mergeIntervals } from "./solution";

test("fusiona los intervalos que se solapan", () => {
  expect(
    mergeIntervals([
      [1, 3],
      [2, 6],
      [8, 10],
      [15, 18],
    ]),
  ).toEqual([
    [1, 6],
    [8, 10],
    [15, 18],
  ]);
});

test("fusiona intervalos que se tocan en un extremo", () => {
  expect(
    mergeIntervals([
      [1, 4],
      [4, 5],
    ]),
  ).toEqual([[1, 5]]);
});

test("ordena los intervalos que llegan desordenados", () => {
  expect(
    mergeIntervals([
      [5, 6],
      [1, 2],
    ]),
  ).toEqual([
    [1, 2],
    [5, 6],
  ]);
});

test("la lista vacía devuelve una lista vacía", () => {
  expect(mergeIntervals([])).toEqual([]);
});
