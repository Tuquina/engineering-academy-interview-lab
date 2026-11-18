import type { ProgressState } from "../domain/progress";

/**
 * Puerto de persistencia del progreso.
 *
 * Contrato pensado para `useSyncExternalStore`: `getSnapshot` debe devolver la misma referencia mientras el
 * estado no cambie, y `subscribe` debe notificar cambios propios y externos (por ejemplo, otra pestaña).
 */
export interface ProgressStore {
  getSnapshot(): ProgressState;
  /** Aplica una transformación pura al estado actual y la persiste. */
  update(transform: (state: ProgressState) => ProgressState): void;
  subscribe(listener: () => void): () => void;
}
