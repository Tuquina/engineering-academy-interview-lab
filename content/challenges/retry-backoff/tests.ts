import { retry } from "./solution";

/** Operación que falla `failures` veces y después devuelve "ok". */
function flaky(failures: number) {
  return mockFn<[number], Promise<string>>(async (attempt) => {
    if (attempt <= failures) throw new Error(`fallo ${attempt}`);
    return "ok";
  });
}

test("devuelve el resultado cuando un reintento tiene éxito", async () => {
  const delays: number[] = [];
  const operation = flaky(2);
  const result = await retry(operation, {
    retries: 3,
    baseDelayMs: 10,
    sleep: async (ms) => void delays.push(ms),
  });
  expect(result).toBe("ok");
  expect(operation).toHaveBeenCalledTimes(3);
});

test("las esperas crecen exponencialmente", async () => {
  const delays: number[] = [];
  await retry(flaky(3), { retries: 3, baseDelayMs: 100, sleep: async (ms) => void delays.push(ms) });
  expect(delays).toEqual([100, 200, 400]);
});

test("si se agotan los intentos rechaza con el último error", async () => {
  const operation = flaky(10);
  await expect(retry(operation, { retries: 2, baseDelayMs: 1, sleep: async () => {} })).rejects.toThrow(
    "fallo 3",
  );
  expect(operation).toHaveBeenCalledTimes(3);
});
