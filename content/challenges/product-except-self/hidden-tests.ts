import { productExceptSelf } from "./solution";

const normalize = (values: number[]) => values.map((v) => (Object.is(v, -0) ? 0 : v));

test(
  "con dos ceros todo da cero",
  () => {
    expect(normalize(productExceptSelf([0, 4, 0]))).toEqual([0, 0, 0]);
  },
  { category: "edge-cases" },
);

test(
  "signos negativos",
  () => {
    expect(productExceptSelf([-2, -3, 4])).toEqual([-12, -8, 6]);
  },
  { category: "edge-cases" },
);

test(
  "resuelve 100.000 elementos en tiempo lineal",
  () => {
    const nums = Array.from({ length: 100_000 }, (_, i) => (i % 2 ? 1 : -1));
    const result = productExceptSelf(nums);
    expect(result).toHaveLength(100_000);
    expect(result[0]).toBe(-1); // 50.000 menos uno = 49.999 factores -1
  },
  { category: "robustness", timeoutMs: 1_500 },
);
