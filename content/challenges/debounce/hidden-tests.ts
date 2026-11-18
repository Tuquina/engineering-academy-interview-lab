import { debounce } from "./solution";

test("cada llamada reinicia la espera", async () => {
  const fn = mockFn();
  const debounced = debounce(fn, 50);
  debounced();
  await sleep(30);
  debounced();
  await sleep(30);
  expect(fn).toHaveBeenCalledTimes(0);
  await sleep(50);
  expect(fn).toHaveBeenCalledTimes(1);
});

test("ráfagas separadas producen ejecuciones separadas", async () => {
  const fn = mockFn<[number]>();
  const debounced = debounce(fn, 20);
  debounced(1);
  await sleep(50);
  debounced(2);
  await sleep(50);
  expect(fn.calls).toEqual([[1], [2]]);
});

test(
  "con waitMs = 0 la ejecución sigue siendo asíncrona",
  async () => {
    const fn = mockFn();
    const debounced = debounce(fn, 0);
    debounced();
    expect(fn).toHaveBeenCalledTimes(0);
    await sleep(10);
    expect(fn).toHaveBeenCalledTimes(1);
  },
  { category: "edge-cases" },
);

test(
  "cancel() sin nada pendiente no falla y permite seguir usándolo",
  async () => {
    const fn = mockFn();
    const debounced = debounce(fn, 10);
    debounced.cancel();
    debounced();
    await sleep(30);
    expect(fn).toHaveBeenCalledTimes(1);
  },
  { category: "edge-cases" },
);
