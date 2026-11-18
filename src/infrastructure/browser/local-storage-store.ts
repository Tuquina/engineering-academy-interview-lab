import type { ExternalStore } from "@/shared/kernel/external-store";

/** Subconjunto de `Storage` que necesita el adaptador; facilita los tests sin navegador. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/** Fuente de eventos `storage` (normalmente `window`) para sincronizar pestañas. */
export type StorageEventSource = Pick<Window, "addEventListener" | "removeEventListener">;

export interface LocalStorageStoreOptions<T> {
  readonly key: string;
  readonly empty: T;
  /**
   * Convierte el JSON almacenado en estado válido. Debe validar y, si corresponde, migrar versiones anteriores.
   * Devuelve `null` si los datos son irrecuperables: el store usa entonces `empty`.
   */
  readonly parse: (data: unknown) => T | null;
}

/**
 * Implementación de {@link ExternalStore} sobre `localStorage`.
 *
 * - Valida lo leído: datos corruptos o desconocidos se tratan como estado vacío, sin romper la UI.
 * - Cachea el último valor parseado por contenido crudo para devolver referencias estables a React.
 * - Escucha el evento `storage` para reflejar cambios hechos en otras pestañas.
 * - Si el almacenamiento falla (modo privado, cuota excedida), conserva el estado en memoria durante la sesión.
 */
export class LocalStorageStore<T> implements ExternalStore<T> {
  private readonly listeners = new Set<() => void>();
  private cachedRaw: string | null | undefined;
  private cachedState: T;
  private memoryFallback: T | null = null;

  constructor(
    private readonly options: LocalStorageStoreOptions<T>,
    private readonly storage: KeyValueStorage | null,
    private readonly events: StorageEventSource | null = null,
  ) {
    this.cachedState = options.empty;
  }

  getSnapshot = (): T => {
    if (this.memoryFallback) return this.memoryFallback;
    const raw = this.safeRead();
    if (raw !== this.cachedRaw) {
      this.cachedRaw = raw;
      this.cachedState = this.parseRaw(raw);
    }
    return this.cachedState;
  };

  update = (transform: (state: T) => T): void => {
    const current = this.getSnapshot();
    const next = transform(current);
    if (next === current) return;
    try {
      if (!this.storage) throw new Error("Storage no disponible");
      this.storage.setItem(this.options.key, JSON.stringify(next));
      this.memoryFallback = null;
    } catch {
      this.memoryFallback = next;
    }
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    const onStorage = (event: Event): void => {
      if ((event as StorageEvent).key === this.options.key) listener();
    };
    this.events?.addEventListener("storage", onStorage);
    return () => {
      this.listeners.delete(listener);
      this.events?.removeEventListener("storage", onStorage);
    };
  };

  private safeRead(): string | null {
    try {
      return this.storage?.getItem(this.options.key) ?? null;
    } catch {
      return null;
    }
  }

  private parseRaw(raw: string | null): T {
    if (!raw) return this.options.empty;
    try {
      return this.options.parse(JSON.parse(raw)) ?? this.options.empty;
    } catch {
      return this.options.empty;
    }
  }
}

/** Store sin persistencia para el render en servidor: siempre devuelve el estado vacío. */
export function createServerSnapshotStore<T>(empty: T): ExternalStore<T> {
  return { getSnapshot: () => empty, update: () => undefined, subscribe: () => () => undefined };
}
