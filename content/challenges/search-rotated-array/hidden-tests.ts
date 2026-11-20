import { searchRotated } from "./solution";

test(
  "sin rotación se comporta como una búsqueda binaria",
  () => {
    expect(searchRotated([1, 2, 3, 4, 5], 4)).toBe(3);
  },
  { category: "edge-cases" },
);

test(
  "dos elementos rotados",
  () => {
    expect(searchRotated([3, 1], 1)).toBe(1);
    expect(searchRotated([3, 1], 3)).toBe(0);
    expect(searchRotated([1, 3], 3)).toBe(1);
  },
  { category: "edge-cases" },
);

test(
  "encuentra todos los valores en todas las rotaciones posibles",
  () => {
    const base = [2, 5, 8, 11, 14, 17, 20];
    for (let r = 0; r < base.length; r++) {
      const rotated = [...base.slice(r), ...base.slice(0, r)];
      rotated.forEach((value, index) => expect(searchRotated(rotated, value)).toBe(index));
      expect(searchRotated(rotated, 9)).toBe(-1);
    }
  },
  { category: "correctness" },
);

test(
  "hace O(log n) lecturas en un array de un millón",
  () => {
    const n = 1_000_000;
    const values = Array.from({ length: n }, (_, i) => (i + 300_000) % n);
    let reads = 0;
    const counted = new Proxy(values, {
      get(target, property, receiver) {
        if (typeof property === "string" && /^\d+$/.test(property)) reads++;
        return Reflect.get(target, property, receiver);
      },
    });
    expect(searchRotated(counted, 42)).toBe(values.indexOf(42));
    expect(reads).toBeLessThan(200);
  },
  { category: "robustness", timeoutMs: 2_000 },
);
