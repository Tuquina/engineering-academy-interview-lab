/**
 * Web Worker con PostgreSQL (PGlite) en memoria. Aísla las consultas del usuario del hilo de la página y de cualquier
 * base de datos real: si una consulta tarda demasiado, el hilo principal termina este worker y crea otro limpio.
 */
import { PgliteSqlEngine } from "./pglite-sql-engine";

export type SqlWorkerRequest =
  | { id: number; method: "init"; dataset: string }
  | { id: number; method: "execute"; sql: string; rollback: boolean }
  | { id: number; method: "reset" }
  | { id: number; method: "describeSchema" };

export type SqlWorkerResponse =
  { id: number; ok: true; value: unknown } | { id: number; ok: false; message: string };

const scope = globalThis as unknown as {
  postMessage(message: SqlWorkerResponse): void;
  addEventListener(type: "message", listener: (event: MessageEvent<SqlWorkerRequest>) => void): void;
};

let engine: PgliteSqlEngine | null = null;

scope.addEventListener("message", (event) => {
  const request = event.data;
  void (async () => {
    try {
      let value: unknown = null;
      if (request.method === "init") {
        engine = new PgliteSqlEngine(request.dataset);
        await engine.describeSchema(); // fuerza la carga del dataset
      } else if (!engine) {
        throw new Error("El motor SQL no fue inicializado.");
      } else if (request.method === "execute") {
        value = await engine.execute(request.sql, { rollback: request.rollback });
      } else if (request.method === "reset") {
        await engine.reset();
      } else {
        value = await engine.describeSchema();
      }
      scope.postMessage({ id: request.id, ok: true, value });
    } catch (error) {
      scope.postMessage({
        id: request.id,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
});
