import { isValid } from "./solution";

test(
  "el string vacío es válido",
  () => {
    expect(isValid("")).toBe(true);
  },
  { category: "edge-cases" },
);

test(
  "aperturas sin cerrar son inválidas",
  () => {
    expect(isValid("((")).toBe(false);
    expect(isValid("{[")).toBe(false);
  },
  { category: "edge-cases" },
);

test(
  "un cierre sin apertura previa es inválido aunque después se compense",
  () => {
    expect(isValid(")(")).toBe(false);
    expect(isValid("]")).toBe(false);
  },
  { category: "edge-cases" },
);

test(
  "procesa 100.000 caracteres anidados",
  () => {
    const deep = "(".repeat(50_000) + ")".repeat(50_000);
    expect(isValid(deep)).toBe(true);
    expect(isValid(deep + "(")).toBe(false);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
