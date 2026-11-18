export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Transforma el valor si el resultado es exitoso; propaga el error sin cambios. */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  throw new Error("No implementado");
}

/** Encadena una operación que también puede fallar. */
export function andThen<T, U, E, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F> {
  throw new Error("No implementado");
}

/** Devuelve el valor o `fallback` si es un error. */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  throw new Error("No implementado");
}

export type AmountError = "empty" | "invalid-format" | "too-many-decimals" | "not-positive";

/** Convierte un monto escrito por un operador ("1.500,50") en centavos. */
export function parseAmountCents(input: string): Result<number, AmountError> {
  // Problema: parseFloat acepta basura ("12a" → 12) y multiplicar floats por 100 pierde precisión.
  const value = Math.round(parseFloat(input.replace(",", ".")) * 100);
  return ok(value);
}
