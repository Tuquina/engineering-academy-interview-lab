import { debounce } from "./solution";

test("ejecuta una sola vez después de la ráfaga, con los últimos argumentos", async () => {
  const fn = mockFn<[string]>();
  const search = debounce(fn, 40);
  search("d");
  search("de");
  search("deu");
  expect(fn).toHaveBeenCalledTimes(0);
  await sleep(80);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn.calls[0]).toEqual(["deu"]);
});

test("no ejecuta antes de que pase el tiempo de espera", async () => {
  const fn = mockFn();
  const debounced = debounce(fn, 60);
  debounced();
  await sleep(20);
  expect(fn).toHaveBeenCalledTimes(0);
});

test("cancel() descarta la ejecución pendiente", async () => {
  const fn = mockFn();
  const debounced = debounce(fn, 30);
  debounced();
  debounced.cancel();
  await sleep(60);
  expect(fn).toHaveBeenCalledTimes(0);
});
