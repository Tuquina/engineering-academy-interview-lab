import { createLimiter } from "./solution";

/** Crea `count` tareas que registran cuántas corren a la vez. */
function trackedTasks(count: number, durationMs: number) {
  let running = 0;
  let maxRunning = 0;
  const tasks = Array.from({ length: count }, (_, i) => async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await sleep(durationMs);
    running--;
    return i;
  });
  return { tasks, maxRunning: () => maxRunning };
}

test(
  "nunca ejecuta más tareas que el límite",
  async () => {
    const limit = createLimiter(2);
    const { tasks, maxRunning } = trackedTasks(6, 15);
    await Promise.all(tasks.map((task) => limit(task)));
    expect(maxRunning()).toBe(2);
  },
  { category: "concurrency" },
);

test("devuelve el resultado de cada tarea", async () => {
  const limit = createLimiter(3);
  const results = await Promise.all([1, 2, 3, 4].map((n) => limit(async () => n * 10)));
  expect(results).toEqual([10, 20, 30, 40]);
});

test(
  "una tarea fallida rechaza su promesa sin detener la cola",
  async () => {
    const limit = createLimiter(1);
    const failing = limit(async () => {
      throw new Error("falló");
    });
    const next = limit(async () => "sigue");
    await expect(failing).rejects.toThrow("falló");
    expect(await next).toBe("sigue");
  },
  { category: "robustness" },
);
