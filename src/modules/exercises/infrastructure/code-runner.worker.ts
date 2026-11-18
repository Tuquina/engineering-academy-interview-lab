/**
 * Web Worker que ejecuta código de ejercicios en el navegador del usuario.
 *
 * Capas de aislamiento:
 * 1. Corre en un hilo separado: un bucle infinito no congela la página y el hilo principal lo termina con
 *    `worker.terminate()` al vencer el timeout.
 * 2. Antes de ejecutar nada se eliminan las APIs de red y de carga de código (fetch, XHR, WebSocket, importScripts…).
 * 3. El código se evalúa con un `require` restringido (sólo `./solution`).
 * 4. Se crea un worker nuevo por ejecución: no queda estado entre intentos.
 *
 * El código nunca llega al servidor: no hay credenciales de la plataforma a las que pueda acceder.
 */
import { runExercise, type RunRequest } from "../domain/run-exercise";

const BLOCKED_GLOBALS = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "importScripts",
  "Worker",
  "SharedWorker",
  "BroadcastChannel",
  "indexedDB",
  "caches",
] as const;

const scope = globalThis as unknown as {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent<RunRequest>) => void): void;
};

for (const name of BLOCKED_GLOBALS) {
  try {
    Object.defineProperty(globalThis, name, { value: undefined, writable: false, configurable: false });
  } catch {
    // Algunas propiedades pueden no ser configurables en ciertos navegadores; el resto de capas sigue vigente.
  }
}

scope.addEventListener("message", (event) => {
  void runExercise(event.data).then((report) => scope.postMessage(report));
});
