import { createLimiter } from "./solution";

test("inicia las tareas en orden de llegada", async () => {
  const limit = createLimiter(1);
  const started: number[] = [];
  await Promise.all(
    [1, 2, 3].map((n) =>
      limit(async () => {
        started.push(n);
        await sleep(5);
      }),
    ),
  );
  expect(started).toEqual([1, 2, 3]);
});

test("expone activeCount y pendingCount", async () => {
  const limit = createLimiter(2);
  const all = [1, 2, 3, 4, 5].map(() => limit(() => sleep(20)));
  await sleep(5);
  expect(limit.activeCount).toBe(2);
  expect(limit.pendingCount).toBe(3);
  await Promise.all(all);
  expect(limit.activeCount).toBe(0);
  expect(limit.pendingCount).toBe(0);
});

test(
  "una tarea que lanza de forma síncrona también libera su lugar",
  async () => {
    const limit = createLimiter(1);
    const broken = limit((() => {
      throw new Error("sync");
    }) as () => Promise<never>);
    await expect(broken).rejects.toThrow("sync");
    expect(await limit(async () => "ok")).toBe("ok");
  },
  { category: "edge-cases" },
);

test(
  "rechaza un límite menor a 1",
  () => {
    expect(() => createLimiter(0)).toThrow();
  },
  { category: "edge-cases" },
);

test(
  "con un límite mayor que la cantidad de tareas, corren todas a la vez",
  async () => {
    const limit = createLimiter(10);
    const start = Date.now();
    await Promise.all([1, 2, 3].map(() => limit(() => sleep(30))));
    expect(Date.now() - start).toBeLessThan(80);
  },
  { category: "concurrency" },
);
