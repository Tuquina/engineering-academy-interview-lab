import { andThen, err, map, ok, parseAmountCents, unwrapOr } from "./solution";

test("map transforma sólo el caso exitoso", () => {
  expect(map(ok(2), (n) => n * 10)).toEqual({ ok: true, value: 20 });
  expect(map(err("x"), (n: number) => n * 10)).toEqual({ ok: false, error: "x" });
});

test("andThen encadena operaciones que pueden fallar", () => {
  const half = (n: number) => (n % 2 === 0 ? ok(n / 2) : err("odd" as const));
  expect(andThen(ok(8), half)).toEqual({ ok: true, value: 4 });
  expect(andThen(ok(3), half)).toEqual({ ok: false, error: "odd" });
  expect(andThen(err("before" as const), half)).toEqual({ ok: false, error: "before" });
});

test("unwrapOr devuelve el valor o el valor por defecto", () => {
  expect(unwrapOr(ok(5), 0)).toBe(5);
  expect(unwrapOr(err("x"), 0)).toBe(0);
});

test("parseAmountCents convierte montos válidos a centavos", () => {
  expect(parseAmountCents("1500")).toEqual(ok(150000));
  expect(parseAmountCents("1500,5")).toEqual(ok(150050));
  expect(parseAmountCents("1.500,50")).toEqual(ok(150050));
});

test(
  "parseAmountCents rechaza formatos inválidos",
  () => {
    expect(parseAmountCents("12a")).toEqual(err("invalid-format"));
    expect(parseAmountCents("")).toEqual(err("empty"));
  },
  { category: "edge-cases" },
);
