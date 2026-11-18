import { err, map, ok, parseAmountCents } from "./solution";

test(
  "ignora espacios alrededor del monto",
  () => {
    expect(parseAmountCents("  42,10 ")).toEqual(ok(4210));
  },
  { category: "edge-cases" },
);

test(
  "rechaza más de dos decimales",
  () => {
    expect(parseAmountCents("10,999")).toEqual(err("too-many-decimals"));
  },
  { category: "edge-cases" },
);

test(
  "rechaza montos no positivos",
  () => {
    expect(parseAmountCents("0")).toEqual(err("not-positive"));
    expect(parseAmountCents("0,00")).toEqual(err("not-positive"));
  },
  { category: "edge-cases" },
);

test(
  "rechaza formatos ambiguos o mal agrupados",
  () => {
    expect(parseAmountCents("1,500.50")).toEqual(err("invalid-format"));
    expect(parseAmountCents("15.00")).toEqual(err("invalid-format"));
    expect(parseAmountCents("-10")).toEqual(err("invalid-format"));
    expect(parseAmountCents("1e3")).toEqual(err("invalid-format"));
  },
  { category: "robustness" },
);

test(
  "no pierde precisión con decimales problemáticos en binario",
  () => {
    // 0,29 × 100 en coma flotante da 28.999999999999996.
    expect(parseAmountCents("0,29")).toEqual(ok(29));
    expect(parseAmountCents("1.234.567,89")).toEqual(ok(123456789));
  },
  { category: "robustness" },
);

test("map no ejecuta la función en el caso de error", () => {
  const fn = mockFn<[number], number>((n) => n);
  map(err("x"), fn);
  expect(fn).toHaveBeenCalledTimes(0);
});
