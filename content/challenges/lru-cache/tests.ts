import { LRUCache } from "./solution";

test("guarda y devuelve valores", () => {
  const cache = new LRUCache<string, number>(2);
  cache.put("a", 1);
  cache.put("b", 2);
  expect(cache.get("a")).toBe(1);
  expect(cache.get("b")).toBe(2);
  expect(cache.get("z")).toBeUndefined();
});

test("al superar la capacidad descarta la menos usada recientemente", () => {
  const cache = new LRUCache<string, number>(2);
  cache.put("a", 1);
  cache.put("b", 2);
  cache.get("a"); // "b" pasa a ser la menos usada
  cache.put("c", 3);
  expect(cache.get("b")).toBeUndefined();
  expect(cache.get("a")).toBe(1);
  expect(cache.get("c")).toBe(3);
  expect(cache.size).toBe(2);
});
