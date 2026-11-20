import { LRUCache } from "./solution";

test(
  "actualizar una clave existente también cuenta como uso y no cambia el tamaño",
  () => {
    const cache = new LRUCache<string, number>(2);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("a", 10); // "a" se actualiza y pasa a ser la más reciente
    expect(cache.size).toBe(2);
    cache.put("c", 3); // se descarta "b"
    expect(cache.get("a")).toBe(10);
    expect(cache.get("b")).toBeUndefined();
  },
  { category: "edge-cases" },
);

test(
  "capacidad 1",
  () => {
    const cache = new LRUCache<number, string>(1);
    cache.put(1, "uno");
    cache.put(2, "dos");
    expect(cache.get(1)).toBeUndefined();
    expect(cache.get(2)).toBe("dos");
    expect(cache.size).toBe(1);
  },
  { category: "edge-cases" },
);

test(
  "un get de una clave inexistente no altera el orden",
  () => {
    const cache = new LRUCache<string, number>(2);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.get("x");
    cache.put("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  },
  { category: "edge-cases" },
);

test(
  "valores falsy se guardan correctamente",
  () => {
    const cache = new LRUCache<string, number>(2);
    cache.put("cero", 0);
    expect(cache.get("cero")).toBe(0);
  },
  { category: "edge-cases" },
);

test(
  "200.000 operaciones en tiempo constante por operación",
  () => {
    const cache = new LRUCache<number, number>(1_000);
    for (let i = 0; i < 100_000; i++) {
      cache.put(i, i);
      cache.get(i - 500);
    }
    expect(cache.size).toBe(1_000);
    expect(cache.get(99_999)).toBe(99_999);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
