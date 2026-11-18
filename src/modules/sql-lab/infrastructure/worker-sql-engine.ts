import type { ExecOutcome, SqlEngine, TableSchema } from "../application/sql-engine";
import type { SqlWorkerRequest, SqlWorkerResponse } from "./sql.worker";

/** Tiempo máximo de una consulta antes de reiniciar el motor (protege de consultas que no terminan). */
export const QUERY_TIMEOUT_MS = 10_000;

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

/**
 * {@link SqlEngine} del navegador: delega en un Web Worker con PGlite. Una consulta que supera
 * {@link QUERY_TIMEOUT_MS} termina el worker y crea uno nuevo con el dataset limpio.
 */
export class WorkerSqlEngine implements SqlEngine {
  private worker: Worker | null = null;
  private ready: Promise<unknown> | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(private readonly dataset: string) {}

  private start(): Promise<unknown> {
    if (this.ready) return this.ready;
    const worker = new Worker(new URL("./sql.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<SqlWorkerResponse>) => {
      const { id } = event.data;
      const entry = this.pending.get(id);
      if (!entry) return;
      this.pending.delete(id);
      if (event.data.ok) entry.resolve(event.data.value);
      else entry.reject(new Error(event.data.message));
    };
    this.worker = worker;
    this.ready = this.send({ method: "init", dataset: this.dataset }, 60_000);
    return this.ready;
  }

  private send(request: WithoutId<SqlWorkerRequest>, timeoutMs: number): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.restart();
        reject(
          new Error(
            `La operación superó ${timeoutMs / 1000} s: se reinició la base con el dataset original.`,
          ),
        );
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.worker?.postMessage({ ...request, id } as SqlWorkerRequest);
    });
  }

  private restart(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.pending.forEach((p) => p.reject(new Error("El motor SQL se reinició.")));
    this.pending.clear();
  }

  async execute(sql: string, options: { rollback: boolean }): Promise<ExecOutcome> {
    await this.start();
    try {
      return (await this.send(
        { method: "execute", sql, rollback: options.rollback },
        QUERY_TIMEOUT_MS,
      )) as ExecOutcome;
    } catch (error) {
      return {
        ok: false,
        durationMs: QUERY_TIMEOUT_MS,
        error: { message: (error as Error).message, code: null, position: null, hint: null, detail: null },
      };
    }
  }

  async reset(): Promise<void> {
    await this.start();
    await this.send({ method: "reset" }, 60_000);
  }

  async describeSchema(): Promise<TableSchema[]> {
    await this.start();
    return (await this.send({ method: "describeSchema" }, 30_000)) as TableSchema[];
  }
}
