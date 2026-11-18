import { throttle } from "./solution";

test("la primera llamada se ejecuta de inmediato", () => {
  const fn = mockFn<[number]>();
  const update = throttle(fn, 50);
  update(1);
  expect(fn.calls).toEqual([[1]]);
});

test("dentro de la ventana se ejecuta una vez al final con los últimos argumentos", async () => {
  const fn = mockFn<[number]>();
  const update = throttle(fn, 50);
  update(1);
  update(2);
  update(3);
  expect(fn).toHaveBeenCalledTimes(1);
  await sleep(90);
  expect(fn.calls).toEqual([[1], [3]]);
});

test("cancel() descarta la ejecución final pendiente", async () => {
  const fn = mockFn<[number]>();
  const update = throttle(fn, 40);
  update(1);
  update(2);
  update.cancel();
  await sleep(80);
  expect(fn.calls).toEqual([[1]]);
});
