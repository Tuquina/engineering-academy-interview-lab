import { isValid } from "./solution";

test("acepta pares simples consecutivos", () => {
  expect(isValid("()[]{}")).toBe(true);
});

test("acepta pares anidados", () => {
  expect(isValid("([{}])")).toBe(true);
});

test("rechaza tipos que no coinciden", () => {
  expect(isValid("(]")).toBe(false);
});

test("rechaza cierres en el orden incorrecto", () => {
  expect(isValid("([)]")).toBe(false);
});
