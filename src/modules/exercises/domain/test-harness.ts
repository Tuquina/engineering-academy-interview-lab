/**
 * Mini framework de tests para ejercicios ejecutados en el navegador (Web Worker) y en Node (verificación del
 * contenido). Sin dependencias: API inspirada en Jest/Vitest (`test`, `expect`, `mockFn`) reducida a lo necesario.
 *
 * Se usa tal cual en dos contextos, lo que garantiza que una solución de referencia verificada en CI se comporte
 * igual en el navegador del usuario.
 */

/** Dimensión de evaluación a la que aporta un test (MASTER_PROMPT §19). */
export type TestCategory = "correctness" | "edge-cases" | "robustness" | "concurrency";

export const CATEGORY_LABELS: Readonly<Record<TestCategory, string>> = {
  correctness: "Correctitud",
  "edge-cases": "Casos límite",
  robustness: "Robustez",
  concurrency: "Concurrencia",
};

export interface TestResult {
  readonly name: string;
  /** Test oculto: su código no se muestra al usuario (verifica casos que la consigna no enumera). */
  readonly hidden: boolean;
  readonly category: TestCategory;
  readonly status: "passed" | "failed" | "timeout";
  readonly error: string | null;
  readonly durationMs: number;
}

export interface TestOptions {
  readonly category?: TestCategory;
  /** Timeout de este test en ms (por defecto, el de la ejecución). */
  readonly timeoutMs?: number;
}

/** Error de aserción con mensaje legible en español. */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

/** Representación legible y acotada de un valor para mensajes de error. */
export function formatValue(value: unknown, depth = 0): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return `[Function ${value.name || "anónima"}]`;
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value instanceof Map) return `Map(${formatValue([...value.entries()], depth)})`;
  if (value instanceof Set) return `Set(${formatValue([...value.values()], depth)})`;
  if (Array.isArray(value)) {
    if (depth > 2) return "[…]";
    const items = value.slice(0, 10).map((v) => formatValue(v, depth + 1));
    return `[${items.join(", ")}${value.length > 10 ? ", …" : ""}]`;
  }
  if (value !== null && typeof value === "object") {
    if (depth > 2) return "{…}";
    const entries = Object.entries(value).slice(0, 10);
    return `{ ${entries.map(([k, v]) => `${k}: ${formatValue(v, depth + 1)}`).join(", ")} }`;
  }
  return String(value);
}

/** Igualdad estructural profunda (como `toEqual`): ignora identidad, compara contenido. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Map && b instanceof Map) {
    return a.size === b.size && [...a].every(([k, v]) => b.has(k) && deepEqual(v, b.get(k)));
  }
  if (a instanceof Set && b instanceof Set) return a.size === b.size && [...a].every((v) => b.has(v));
  const keysA = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const keysB = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

type Matchers = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toContain(item: unknown): void;
  toHaveLength(n: number): void;
  toThrow(message?: string | RegExp): void;
  toHaveBeenCalledTimes(n: number): void;
};

export type Expectation = Matchers & {
  not: Matchers;
  resolves: AsyncMatchers;
  rejects: AsyncMatchers;
};
type AsyncMatchers = { [K in keyof Matchers]: (...args: Parameters<Matchers[K]>) => Promise<void> };

/** Función espía: registra llamadas y delega en una implementación opcional. */
export interface MockFn<A extends unknown[] = unknown[], R = unknown> {
  (...args: A): R;
  readonly calls: A[];
  mockImplementation(impl: (...args: A) => R): MockFn<A, R>;
}

export function mockFn<A extends unknown[] = unknown[], R = unknown>(impl?: (...args: A) => R): MockFn<A, R> {
  let implementation = impl;
  const calls: A[] = [];
  const fn = ((...args: A) => {
    calls.push(args);
    return implementation?.(...args) as R;
  }) as MockFn<A, R>;
  Object.defineProperty(fn, "calls", { value: calls });
  fn.mockImplementation = (next) => {
    implementation = next;
    return fn;
  };
  return fn;
}

function matchers(actual: unknown, negate: boolean): Matchers {
  const assert = (pass: boolean, message: string, negatedMessage: string) => {
    if (pass === negate) throw new AssertionError(negate ? negatedMessage : message);
  };
  const show = formatValue;
  return {
    toBe: (expected) =>
      assert(
        Object.is(actual, expected),
        `Se esperaba ${show(expected)} pero se obtuvo ${show(actual)}`,
        `No se esperaba ${show(expected)}`,
      ),
    toEqual: (expected) =>
      assert(
        deepEqual(actual, expected),
        `Se esperaba (igualdad profunda) ${show(expected)} pero se obtuvo ${show(actual)}`,
        `No se esperaba un valor igual a ${show(expected)}`,
      ),
    toBeTruthy: () =>
      assert(
        Boolean(actual),
        `Se esperaba un valor verdadero, se obtuvo ${show(actual)}`,
        `Se esperaba un valor falso, se obtuvo ${show(actual)}`,
      ),
    toBeFalsy: () =>
      assert(
        !actual,
        `Se esperaba un valor falso, se obtuvo ${show(actual)}`,
        `Se esperaba un valor verdadero, se obtuvo ${show(actual)}`,
      ),
    toBeNull: () =>
      assert(actual === null, `Se esperaba null, se obtuvo ${show(actual)}`, "No se esperaba null"),
    toBeUndefined: () =>
      assert(
        actual === undefined,
        `Se esperaba undefined, se obtuvo ${show(actual)}`,
        "No se esperaba undefined",
      ),
    toBeDefined: () =>
      assert(
        actual !== undefined,
        "Se esperaba un valor definido",
        `Se esperaba undefined, se obtuvo ${show(actual)}`,
      ),
    toBeGreaterThan: (n) =>
      assert(
        (actual as number) > n,
        `Se esperaba un valor > ${n}, se obtuvo ${show(actual)}`,
        `Se esperaba un valor <= ${n}`,
      ),
    toBeGreaterThanOrEqual: (n) =>
      assert(
        (actual as number) >= n,
        `Se esperaba un valor >= ${n}, se obtuvo ${show(actual)}`,
        `Se esperaba un valor < ${n}`,
      ),
    toBeLessThan: (n) =>
      assert(
        (actual as number) < n,
        `Se esperaba un valor < ${n}, se obtuvo ${show(actual)}`,
        `Se esperaba un valor >= ${n}`,
      ),
    toBeLessThanOrEqual: (n) =>
      assert(
        (actual as number) <= n,
        `Se esperaba un valor <= ${n}, se obtuvo ${show(actual)}`,
        `Se esperaba un valor > ${n}`,
      ),
    toContain: (item) => {
      const pass =
        typeof actual === "string"
          ? actual.includes(String(item))
          : Array.isArray(actual) && actual.some((v) => deepEqual(v, item));
      assert(
        pass,
        `Se esperaba que ${show(actual)} contuviera ${show(item)}`,
        `No se esperaba que ${show(actual)} contuviera ${show(item)}`,
      );
    },
    toHaveLength: (n) => {
      const length = (actual as { length?: unknown } | null)?.length;
      assert(
        length === n,
        `Se esperaba longitud ${n}, se obtuvo ${show(length)}`,
        `No se esperaba longitud ${n}`,
      );
    },
    toThrow: (message) => {
      if (typeof actual !== "function")
        throw new AssertionError("toThrow requiere una función: expect(() => …)");
      let thrown: unknown;
      let didThrow = false;
      try {
        actual();
      } catch (error) {
        didThrow = true;
        thrown = error;
      }
      const text = thrown instanceof Error ? thrown.message : String(thrown);
      const matches = !didThrow
        ? false
        : message === undefined
          ? true
          : typeof message === "string"
            ? text.includes(message)
            : message.test(text);
      assert(
        matches,
        didThrow
          ? `Se lanzó «${text}», que no coincide con ${show(message)}`
          : "Se esperaba que lanzara un error",
        "No se esperaba un error",
      );
    },
    toHaveBeenCalledTimes: (n) => {
      const calls = (actual as Partial<MockFn> | null)?.calls;
      if (!Array.isArray(calls)) throw new AssertionError("toHaveBeenCalledTimes requiere un mockFn()");
      assert(
        calls.length === n,
        `Se esperaban ${n} llamadas, hubo ${calls.length}`,
        `No se esperaban ${n} llamadas`,
      );
    },
  };
}

function asyncMatchers(promise: unknown, mode: "resolves" | "rejects"): AsyncMatchers {
  const settle = async (): Promise<unknown> => {
    try {
      const value = await promise;
      if (mode === "rejects")
        throw new AssertionError(`Se esperaba un rechazo, pero se resolvió con ${formatValue(value)}`);
      return value;
    } catch (error) {
      if (error instanceof AssertionError) throw error;
      if (mode === "resolves")
        throw new AssertionError(`Se esperaba que se resolviera, pero rechazó con ${formatValue(error)}`);
      return error;
    }
  };
  return new Proxy({} as AsyncMatchers, {
    get:
      (_, key: keyof Matchers) =>
      async (...args: unknown[]) => {
        const value = await settle();
        // Para rejects.toThrow, el "actual" es una función que relanza el error obtenido.
        const subject =
          mode === "rejects" && key === "toThrow"
            ? () => {
                throw value;
              }
            : value;
        (matchers(subject, false)[key] as (...a: unknown[]) => void)(...args);
      },
  });
}

export function expect(actual: unknown): Expectation {
  return {
    ...matchers(actual, false),
    not: matchers(actual, true),
    resolves: asyncMatchers(actual, "resolves"),
    rejects: asyncMatchers(actual, "rejects"),
  };
}

/** Espera `ms` milisegundos (útil para probar debounce, throttle o reintentos con temporizadores reales). */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface RegisteredTest {
  readonly name: string;
  readonly hidden: boolean;
  readonly fn: () => unknown;
  readonly options: TestOptions;
}

/**
 * Crea un registro de tests aislado. `globals` contiene las funciones que se exponen al código del ejercicio.
 */
export function createHarness() {
  const tests: RegisteredTest[] = [];
  const register =
    (hidden: boolean) =>
    (name: string, fn: () => unknown, options: TestOptions = {}) => {
      tests.push({ name, fn, options, hidden });
    };
  const globals = { test: register(false), expect, mockFn, sleep };
  /** Mismas funciones, pero los tests registrados se marcan como ocultos. */
  const hiddenGlobals = { ...globals, test: register(true) };

  /** Ejecuta los tests registrados en orden, cada uno con su timeout. */
  async function run({ defaultTimeoutMs }: { defaultTimeoutMs: number }): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const t of tests) {
      const start = Date.now();
      const timeoutMs = t.options.timeoutMs ?? defaultTimeoutMs;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.resolve().then(t.fn),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new TimeoutSignal(timeoutMs)), timeoutMs);
          }),
        ]);
        results.push(result(t, "passed", null, start));
      } catch (error) {
        if (error instanceof TimeoutSignal) {
          results.push(result(t, "timeout", `Superó el tiempo límite de ${timeoutMs} ms`, start));
        } else {
          results.push(
            result(
              t,
              "failed",
              error instanceof Error
                ? `${error.name === "AssertionError" ? "" : `${error.name}: `}${error.message}`
                : formatValue(error),
              start,
            ),
          );
        }
      } finally {
        clearTimeout(timer);
      }
    }
    return results;
  }

  return { globals, hiddenGlobals, run, count: () => tests.length };
}

class TimeoutSignal extends Error {
  constructor(ms: number) {
    super(`timeout ${ms}`);
  }
}

function result(
  t: RegisteredTest,
  status: TestResult["status"],
  error: string | null,
  start: number,
): TestResult {
  return {
    name: t.name,
    hidden: t.hidden,
    category: t.options.category ?? "correctness",
    status,
    error,
    durationMs: Date.now() - start,
  };
}

/** Declaraciones de tipos que ven los tests en el editor (Monaco) para tener autocompletado y chequeo. */
export const HARNESS_TYPE_DECLARATIONS = `
type TestCategory = "correctness" | "edge-cases" | "robustness" | "concurrency";
interface MockFn<A extends unknown[] = any[], R = any> { (...args: A): R; readonly calls: A[]; mockImplementation(impl: (...args: A) => R): MockFn<A, R>; }
interface Matchers { toBe(e: unknown): void; toEqual(e: unknown): void; toBeTruthy(): void; toBeFalsy(): void; toBeNull(): void; toBeUndefined(): void; toBeDefined(): void; toBeGreaterThan(n: number): void; toBeGreaterThanOrEqual(n: number): void; toBeLessThan(n: number): void; toBeLessThanOrEqual(n: number): void; toContain(item: unknown): void; toHaveLength(n: number): void; toThrow(message?: string | RegExp): void; toHaveBeenCalledTimes(n: number): void; }
type AsyncMatchers = { [K in keyof Matchers]: (...args: Parameters<Matchers[K]>) => Promise<void> };
declare function test(name: string, fn: () => unknown, options?: { category?: TestCategory; timeoutMs?: number }): void;
declare function expect(actual: unknown): Matchers & { not: Matchers; resolves: AsyncMatchers; rejects: AsyncMatchers };
declare function mockFn<A extends unknown[] = any[], R = any>(impl?: (...args: A) => R): MockFn<A, R>;
declare function sleep(ms: number): Promise<void>;
`;
