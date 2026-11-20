import { numIslands } from "./solution";

const parse = (rows: string[]) => rows.map((row) => row.split(""));

test(
  "grillas vacías o sin tierra",
  () => {
    expect(numIslands([])).toBe(0);
    expect(numIslands(parse(["000", "000"]))).toBe(0);
  },
  { category: "edge-cases" },
);

test(
  "una sola fila y una sola columna",
  () => {
    expect(numIslands(parse(["1101011"]))).toBe(3);
    expect(numIslands(parse(["1", "1", "0", "1"]))).toBe(2);
  },
  { category: "edge-cases" },
);

test(
  "no modifica la grilla recibida",
  () => {
    const grid = parse(["110", "011"]);
    numIslands(grid);
    expect(grid).toEqual(parse(["110", "011"]));
  },
  { category: "robustness" },
);

test(
  "una isla de 300×300 no desborda la pila",
  () => {
    const grid = Array.from({ length: 300 }, () => Array.from({ length: 300 }, () => "1"));
    expect(numIslands(grid)).toBe(1);
  },
  { category: "robustness", timeoutMs: 2_000 },
);

test(
  "una isla en forma de serpiente (camino muy largo)",
  () => {
    // Filas alternadas llenas y conectadas por un extremo: un único camino de ~45.000 celdas.
    const grid = Array.from({ length: 300 }, (_, r) =>
      Array.from({ length: 300 }, (_, c) => {
        if (r % 2 === 0) return "1";
        return (r % 4 === 1 && c === 299) || (r % 4 === 3 && c === 0) ? "1" : "0";
      }),
    );
    expect(numIslands(grid)).toBe(1);
  },
  { category: "robustness", timeoutMs: 2_000 },
);
