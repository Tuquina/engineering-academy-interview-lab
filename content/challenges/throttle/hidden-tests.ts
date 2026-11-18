import { throttle } from "./solution";

test(
  "una sola llamada no produce una ejecución final extra",
  async () => {
    const fn = mockFn();
    const update = throttle(fn, 30);
    update();
    await sleep(70);
    expect(fn).toHaveBeenCalledTimes(1);
  },
  { category: "edge-cases" },
);

test("pasada la ventana, una llamada nueva vuelve a ejecutarse de inmediato", async () => {
  const fn = mockFn<[number]>();
  const update = throttle(fn, 40);
  update(1);
  update(2);
  await sleep(150);
  update(3);
  expect(fn.calls).toEqual([[1], [2], [3]]);
});

test(
  "nunca ejecuta más de una vez por ventana durante una ráfaga larga",
  async () => {
    const fn = mockFn();
    const update = throttle(fn, 50);
    for (let i = 0; i < 12; i++) {
      update();
      await sleep(10);
    }
    // ~120 ms de ráfaga con ventanas de 50 ms: a lo sumo 3 ejecuciones (más una final).
    expect(fn.calls.length).toBeLessThanOrEqual(4);
    expect(fn.calls.length).toBeGreaterThanOrEqual(2);
  },
  { category: "robustness" },
);

test(
  "cancel() sin nada pendiente no falla",
  () => {
    const update = throttle(mockFn(), 10);
    expect(() => update.cancel()).not.toThrow();
  },
  { category: "edge-cases" },
);
