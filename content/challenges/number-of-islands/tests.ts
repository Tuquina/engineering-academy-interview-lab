import { numIslands } from "./solution";

const parse = (rows: string[]) => rows.map((row) => row.split(""));

test("cuenta islas separadas por agua", () => {
  expect(numIslands(parse(["11000", "11000", "00100", "00011"]))).toBe(3);
});

test("una isla grande con forma irregular", () => {
  expect(numIslands(parse(["11110", "11010", "11000", "00000"]))).toBe(1);
});

test("las diagonales no conectan", () => {
  expect(numIslands(parse(["101", "010", "101"]))).toBe(5);
});
