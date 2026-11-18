import type { RunReport, RunRequest } from "../domain/run-exercise";

/** Resultado de una ejecución: el reporte del código o un corte por tiempo total excedido. */
export type ExecutionOutcome =
  | { readonly kind: "report"; readonly report: RunReport }
  | { readonly kind: "hard-timeout"; readonly limitMs: number }
  | { readonly kind: "crash"; readonly message: string };

/**
 * Puerto de ejecución de código no confiable. La implementación del navegador usa un Web Worker; una futura
 * implementación remota (Vercel Sandbox u otra infraestructura aislada) podría ejecutar Node.js real.
 */
export interface CodeRunner {
  /**
   * @param hardTimeoutMs límite absoluto: al vencer se destruye el entorno de ejecución (bucles infinitos incluidos).
   */
  run(request: RunRequest, hardTimeoutMs: number): Promise<ExecutionOutcome>;
}
