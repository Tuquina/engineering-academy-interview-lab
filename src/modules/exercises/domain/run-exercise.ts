import { evaluateCommonJs } from "./module-evaluator";
import { createHarness, formatValue, type TestResult } from "./test-harness";

/** Límite de líneas de consola que se devuelven: protege la UI de bucles que imprimen sin parar. */
export const MAX_LOG_ENTRIES = 200;
const MAX_LOG_LENGTH = 2_000;

export interface LogEntry {
  readonly level: "log" | "info" | "warn" | "error";
  readonly message: string;
  /** Milisegundos desde el inicio de la ejecución. */
  readonly atMs: number;
}

export interface RunRequest {
  /** Código de la solución (o del script) ya compilado a CommonJS. */
  readonly solutionJs: string;
  /** Código de los tests compilado a CommonJS; ausente en modo script (playground). */
  readonly testsJs?: string;
  /** Tests ocultos compilados a CommonJS (opcional). */
  readonly hiddenTestsJs?: string;
  readonly defaultTimeoutMs: number;
  /**
   * En modo script, tiempo máximo que se espera a que terminen los temporizadores pendientes
   * (para ver la salida de `setTimeout`, promesas, etc.).
   */
  readonly settleMs?: number;
}

export interface RunReport {
  readonly status: "completed" | "error";
  readonly results: readonly TestResult[];
  readonly logs: readonly LogEntry[];
  /** Error al cargar el código (por ejemplo, una excepción en el nivel superior del módulo). */
  readonly error: string | null;
  readonly durationMs: number;
  /** `true` si quedaron temporizadores activos al vencer `settleMs` (modo script). */
  readonly pendingTimers: boolean;
}

/**
 * Ejecuta una solución y sus tests (o un script) con consola y temporizadores instrumentados.
 *
 * No toca globals del entorno: la consola y los temporizadores instrumentados se inyectan como parámetros del
 * módulo evaluado. Debe correr dentro de un Web Worker (navegador) o en tests del repositorio (Node).
 */
export async function runExercise(request: RunRequest): Promise<RunReport> {
  const start = Date.now();
  const logs: LogEntry[] = [];
  const push =
    (level: LogEntry["level"]) =>
    (...args: unknown[]) => {
      if (logs.length >= MAX_LOG_ENTRIES) return;
      const message = args.map((a) => (typeof a === "string" ? a : formatValue(a))).join(" ");
      logs.push({ level, message: message.slice(0, MAX_LOG_LENGTH), atMs: Date.now() - start });
      if (logs.length === MAX_LOG_ENTRIES) {
        logs.push({
          level: "warn",
          message: `Salida truncada: máximo ${MAX_LOG_ENTRIES} líneas.`,
          atMs: Date.now() - start,
        });
      }
    };
  const sandboxConsole = {
    log: push("log"),
    info: push("info"),
    warn: push("warn"),
    error: push("error"),
    debug: push("log"),
  };

  const timers = trackTimers();
  const globals = {
    console: sandboxConsole,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    setInterval: timers.setInterval,
    clearInterval: timers.clearInterval,
  };
  const harness = createHarness();

  try {
    const solution = evaluateCommonJs(request.solutionJs, {}, globals);
    if (request.testsJs !== undefined) {
      evaluateCommonJs(request.testsJs, { "./solution": solution }, { ...globals, ...harness.globals });
      if (request.hiddenTestsJs) {
        evaluateCommonJs(
          request.hiddenTestsJs,
          { "./solution": solution },
          { ...globals, ...harness.hiddenGlobals },
        );
      }
      const results = await harness.run({ defaultTimeoutMs: request.defaultTimeoutMs });
      timers.clearAll();
      return {
        status: "completed",
        results,
        logs,
        error: null,
        durationMs: Date.now() - start,
        pendingTimers: false,
      };
    }
    const pendingTimers = await timers.settle(request.settleMs ?? 2_000);
    return {
      status: "completed",
      results: [],
      logs,
      error: null,
      durationMs: Date.now() - start,
      pendingTimers,
    };
  } catch (error) {
    timers.clearAll();
    return {
      status: "error",
      results: [],
      logs,
      error: error instanceof Error ? `${error.name}: ${error.message}` : formatValue(error),
      durationMs: Date.now() - start,
      pendingTimers: false,
    };
  }
}

/**
 * Envuelve los temporizadores para saber cuántos siguen activos. Permite esperar a que un script asíncrono termine
 * (sin quedarse colgado con un `setInterval` olvidado) y limpiar todo al final.
 */
function trackTimers() {
  const active = new Set<ReturnType<typeof setTimeout>>();
  let onIdle: (() => void) | null = null;
  const check = () => {
    if (active.size === 0) onIdle?.();
  };
  return {
    setTimeout: (fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
      const id = setTimeout(() => {
        active.delete(id);
        try {
          fn(...args);
        } finally {
          // Se revisa en una microtask para dar lugar a que el callback agende nuevos temporizadores.
          queueMicrotask(check);
        }
      }, ms);
      active.add(id);
      return id;
    },
    clearTimeout: (id: ReturnType<typeof setTimeout>) => {
      clearTimeout(id);
      active.delete(id);
      queueMicrotask(check);
    },
    setInterval: (fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
      const id = setInterval(fn, ms, ...args);
      active.add(id);
      return id;
    },
    clearInterval: (id: ReturnType<typeof setInterval>) => {
      clearInterval(id);
      active.delete(id);
      queueMicrotask(check);
    },
    clearAll: () => {
      active.forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
      });
      active.clear();
    },
    /** Espera a que no queden temporizadores (o a que venza `maxMs`). Devuelve `true` si quedaron pendientes. */
    settle: (maxMs: number): Promise<boolean> =>
      new Promise((resolve) => {
        const finish = (pending: boolean) => {
          onIdle = null;
          clearTimeout(limit);
          active.forEach((id) => {
            clearTimeout(id);
            clearInterval(id);
          });
          active.clear();
          resolve(pending);
        };
        const limit = setTimeout(() => finish(active.size > 0), maxMs);
        onIdle = () => finish(false);
        // Deja correr las microtasks del script antes de evaluar si ya terminó.
        setTimeout(check, 0);
      }),
  };
}
