import { topKFrequent } from "./solution";

test(
  "desempata por el menor valor",
  () => {
    expect(topKFrequent([9, 4, 4, 7, 7, 9], 2)).toEqual([4, 7]);
    expect(topKFrequent([3, 1, 2], 3)).toEqual([1, 2, 3]);
  },
  { category: "edge-cases" },
);

test(
  "k igual a la cantidad de valores distintos",
  () => {
    expect(topKFrequent([2, 2, 1], 2)).toEqual([2, 1]);
  },
  { category: "edge-cases" },
);

test(
  "resuelve 100.000 elementos",
  () => {
    const nums = Array.from({ length: 100_000 }, (_, i) => i % 1000);
    nums.push(42, 42, 7);
    expect(topKFrequent(nums, 2)).toEqual([42, 7]);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
