export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Transforma el valor si el resultado es exitoso; propaga el error sin cambios. */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** Encadena una operación que también puede fallar. */
export function andThen<T, U, E, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F> {
  return result.ok ? fn(result.value) : result;
}

/** Devuelve el valor o `fallback` si es un error. */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

export type AmountError = "empty" | "invalid-format" | "too-many-decimals" | "not-positive";

/** Entero con puntos de miles opcionales (bien agrupados) y hasta N decimales tras una coma. */
const AMOUNT_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/;

/** Convierte un monto escrito por un operador ("1.500,50") en centavos. */
export function parseAmountCents(input: string): Result<number, AmountError> {
  const trimmed = input.trim();
  if (trimmed === "") return err("empty");

  const match = AMOUNT_PATTERN.exec(trimmed);
  if (!match) return err("invalid-format");

  const [, integerPart = "", decimals = ""] = match;
  if (decimals.length > 2) return err("too-many-decimals");

  // Se opera con enteros: nunca se multiplica un número decimal por 100.
  const cents = Number(integerPart.replaceAll(".", "")) * 100 + Number(decimals.padEnd(2, "0"));
  return cents > 0 ? ok(cents) : err("not-positive");
}
