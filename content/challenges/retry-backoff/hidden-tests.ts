import { retry } from "./solution";

const noWait = async () => {};

test("respeta el tope maxDelayMs", async () => {
  const delays: number[] = [];
  let attempt = 0;
  await retry(
    async () => {
      attempt++;
      if (attempt < 5) throw new Error("x");
      return attempt;
    },
    { retries: 5, baseDelayMs: 100, maxDelayMs: 250, sleep: async (ms) => void delays.push(ms) },
  );
  expect(delays).toEqual([100, 200, 250, 250]);
});

test(
  "no reintenta errores no recuperables",
  async () => {
    const operation = mockFn<[number], Promise<never>>(async () => {
      throw new Error("400 Bad Request");
    });
    await expect(
      retry(operation, {
        retries: 3,
        baseDelayMs: 1,
        sleep: noWait,
        shouldRetry: (e) => !String(e).includes("400"),
      }),
    ).rejects.toThrow("400");
    expect(operation).toHaveBeenCalledTimes(1);
  },
  { category: "robustness" },
);

test(
  "con retries: 0 hace un único intento",
  async () => {
    const operation = mockFn<[number], Promise<never>>(async () => {
      throw new Error("falla");
    });
    await expect(retry(operation, { retries: 0, baseDelayMs: 1, sleep: noWait })).rejects.toThrow("falla");
    expect(operation).toHaveBeenCalledTimes(1);
  },
  { category: "edge-cases" },
);

test(
  "deja de reintentar si la señal se aborta",
  async () => {
    const controller = new AbortController();
    const operation = mockFn<[number], Promise<never>>(async () => {
      controller.abort(new Error("cancelado por el usuario"));
      throw new Error("falla");
    });
    await expect(
      retry(operation, { retries: 5, baseDelayMs: 1, sleep: noWait, signal: controller.signal }),
    ).rejects.toThrow("cancelado por el usuario");
    expect(operation).toHaveBeenCalledTimes(1);
  },
  { category: "robustness" },
);

test(
  "no ejecuta nada si la señal ya estaba abortada",
  async () => {
    const controller = new AbortController();
    controller.abort(new Error("ya cancelado"));
    const operation = mockFn<[number], Promise<string>>(async () => "ok");
    await expect(
      retry(operation, { retries: 2, baseDelayMs: 1, sleep: noWait, signal: controller.signal }),
    ).rejects.toThrow("ya cancelado");
    expect(operation).toHaveBeenCalledTimes(0);
  },
  { category: "edge-cases" },
);

test("pasa el número de intento a la operación empezando en 1", async () => {
  const seen: number[] = [];
  await retry(
    async (attempt) => {
      seen.push(attempt);
      if (attempt < 3) throw new Error("x");
      return attempt;
    },
    { retries: 3, baseDelayMs: 1, sleep: noWait },
  );
  expect(seen).toEqual([1, 2, 3]);
});
