import { findOrder } from "./solution";

/** Verifica que `order` sea una permutación de 0..n-1 que respeta todas las correlativas. */
function isValidOrder(n: number, prerequisites: [number, number][], order: number[] | null): boolean {
  if (!order || order.length !== n || new Set(order).size !== n) return false;
  const position = new Map(order.map((course, index) => [course, index]));
  return prerequisites.every(([a, b]) => position.get(b)! < position.get(a)!);
}

test("una correlativa simple", () => {
  const prerequisites: [number, number][] = [[1, 0]];
  expect(isValidOrder(2, prerequisites, findOrder(2, prerequisites))).toBe(true);
});

test("varias correlativas que convergen", () => {
  const prerequisites: [number, number][] = [
    [1, 0],
    [2, 0],
    [3, 1],
    [3, 2],
  ];
  expect(isValidOrder(4, prerequisites, findOrder(4, prerequisites))).toBe(true);
});

test("un ciclo hace imposible el plan", () => {
  expect(
    findOrder(2, [
      [1, 0],
      [0, 1],
    ]),
  ).toBeNull();
});
