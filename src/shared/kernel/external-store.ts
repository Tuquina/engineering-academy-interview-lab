/**
 * Puerto genérico para estado de cliente persistido fuera de React (localStorage hoy, API remota mañana).
 *
 * Contrato pensado para `useSyncExternalStore`:
 * - `getSnapshot` devuelve la misma referencia mientras el estado no cambie.
 * - `subscribe` notifica tanto cambios propios como externos (por ejemplo, otra pestaña).
 * - `update` aplica una transformación pura; si devuelve la misma referencia no se persiste ni se notifica.
 */
export interface ExternalStore<T> {
  getSnapshot(): T;
  update(transform: (state: T) => T): void;
  subscribe(listener: () => void): () => void;
}
