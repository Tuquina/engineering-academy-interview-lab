import { mergeIntervals } from "./solution";

test(
  "un intervalo contenido en otro no acorta el fin",
  () => {
    expect(
      mergeIntervals([
        [1, 10],
        [2, 3],
      ]),
    ).toEqual([[1, 10]]);
  },
  { category: "edge-cases" },
);

test(
  "fusiona en cadena después de ordenar",
  () => {
    expect(
      mergeIntervals([
        [6, 8],
        [1, 3],
        [2, 4],
        [4, 7],
      ]),
    ).toEqual([[1, 8]]);
  },
  { category: "edge-cases" },
);

test(
  "no muta el array recibido",
  () => {
    const input: [number, number][] = [
      [3, 5],
      [1, 4],
    ];
    mergeIntervals(input);
    expect(input).toEqual([
      [3, 5],
      [1, 4],
    ]);
  },
  { category: "robustness" },
);

test(
  "maneja 100.000 intervalos",
  () => {
    const input = Array.from({ length: 100_000 }, (_, i) => [i * 2, i * 2 + 1] as [number, number]).reverse();
    const merged = mergeIntervals(input);
    expect(merged).toHaveLength(100_000);
    expect(merged[0]).toEqual([0, 1]);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
