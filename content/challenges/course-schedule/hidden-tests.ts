import { findOrder } from "./solution";

function isValidOrder(n: number, prerequisites: [number, number][], order: number[] | null): boolean {
  if (!order || order.length !== n || new Set(order).size !== n) return false;
  const position = new Map(order.map((course, index) => [course, index]));
  return prerequisites.every(([a, b]) => position.get(b)! < position.get(a)!);
}

test(
  "materias sin correlativas también aparecen",
  () => {
    expect(isValidOrder(3, [], findOrder(3, []))).toBe(true);
    expect(findOrder(1, [])).toEqual([0]);
  },
  { category: "edge-cases" },
);

test(
  "una materia que es correlativa de sí misma es un ciclo",
  () => {
    expect(findOrder(2, [[1, 1]])).toBeNull();
  },
  { category: "edge-cases" },
);

test(
  "detecta un ciclo dentro de un grafo más grande",
  () => {
    expect(
      findOrder(5, [
        [1, 0],
        [2, 1],
        [3, 2],
        [1, 3],
        [4, 0],
      ]),
    ).toBeNull();
  },
  { category: "edge-cases" },
);

test(
  "correlativas repetidas no rompen el conteo",
  () => {
    const prerequisites: [number, number][] = [
      [1, 0],
      [1, 0],
    ];
    expect(isValidOrder(2, prerequisites, findOrder(2, prerequisites))).toBe(true);
  },
  { category: "edge-cases" },
);

test(
  "una cadena de 10.000 materias",
  () => {
    const n = 10_000;
    const prerequisites = Array.from({ length: n - 1 }, (_, i) => [i + 1, i] as [number, number]);
    expect(isValidOrder(n, prerequisites, findOrder(n, prerequisites))).toBe(true);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
