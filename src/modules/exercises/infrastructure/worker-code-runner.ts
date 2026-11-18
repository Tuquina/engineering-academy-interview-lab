import type { CodeRunner, ExecutionOutcome } from "../application/code-runner";
import type { RunReport, RunRequest } from "../domain/run-exercise";

/**
 * Implementación de {@link CodeRunner} con un Web Worker nuevo por ejecución. Sólo funciona en el navegador.
 */
export class WorkerCodeRunner implements CodeRunner {
  run(request: RunRequest, hardTimeoutMs: number): Promise<ExecutionOutcome> {
    return new Promise((resolve) => {
      const worker = new Worker(new URL("./code-runner.worker.ts", import.meta.url), { type: "module" });
      const finish = (outcome: ExecutionOutcome) => {
        clearTimeout(timer);
        worker.terminate();
        resolve(outcome);
      };
      const timer = setTimeout(() => finish({ kind: "hard-timeout", limitMs: hardTimeoutMs }), hardTimeoutMs);
      worker.onmessage = (event: MessageEvent<RunReport>) => finish({ kind: "report", report: event.data });
      worker.onerror = (event) => {
        event.preventDefault();
        finish({ kind: "crash", message: event.message || "El entorno de ejecución falló." });
      };
      worker.postMessage(request);
    });
  }
}
