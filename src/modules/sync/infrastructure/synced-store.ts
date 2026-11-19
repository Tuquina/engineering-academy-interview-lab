import type { ExternalStore } from "@/shared/kernel/external-store";
import type { KeyValueStorage } from "@/infrastructure/browser/local-storage-store";
import type { LocalReplica, SyncMeta } from "../application/sync-engine";
import type { SyncStoreKey } from "../application/user-documents";
import type { BackupStore } from "../application/user-data-backup";

/**
 * Store de cliente con réplica en la cuenta. Envuelve el store de `localStorage` existente (que sigue siendo la
 * caché local y funciona sin red) y avisa cuando hay cambios para subir. Los componentes no cambian: siguen viendo un
 * `ExternalStore<T>`.
 */
export class SyncedStore<T> implements ExternalStore<T>, LocalReplica<T>, BackupStore {
  private suppress = false;
  private onLocalChange: ((key: SyncStoreKey) => void) | null = null;

  constructor(
    readonly key: SyncStoreKey,
    private readonly inner: ExternalStore<T>,
    readonly empty: T,
    private readonly parser: (data: unknown) => T | null,
    private readonly storage: KeyValueStorage & Pick<Storage, "removeItem">,
  ) {}

  getSnapshot = (): T => this.inner.getSnapshot();

  subscribe = (listener: () => void): (() => void) => this.inner.subscribe(listener);

  update = (transform: (state: T) => T): void => {
    const before = this.inner.getSnapshot();
    this.inner.update(transform);
    if (!this.suppress && this.inner.getSnapshot() !== before) this.onLocalChange?.(this.key);
  };

  /** Reemplaza el estado como un cambio local (por ejemplo, al importar una copia): se sincroniza si hay sesión. */
  replace(state: T): void {
    this.update(() => state);
  }

  /** Lo llama el gestor de sincronización para enterarse de cambios locales. */
  listen(callback: ((key: SyncStoreKey) => void) | null): void {
    this.onLocalChange = callback;
  }

  getState(): T {
    return this.inner.getSnapshot();
  }

  applyRemote(state: T): void {
    this.suppress = true;
    try {
      this.inner.update(() => state);
    } finally {
      this.suppress = false;
    }
  }

  parse(data: unknown): T | null {
    return this.parser(data);
  }

  private get metaKey() {
    return `eal:sync:${this.key}`;
  }

  readMeta(): SyncMeta | null {
    try {
      const raw = this.storage.getItem(this.metaKey);
      if (!raw) return null;
      const meta = JSON.parse(raw) as SyncMeta;
      return typeof meta.userId === "string" && Number.isInteger(meta.revision) ? meta : null;
    } catch {
      return null;
    }
  }

  writeMeta(meta: SyncMeta | null): void {
    try {
      if (meta) this.storage.setItem(this.metaKey, JSON.stringify(meta));
      else this.storage.removeItem(this.metaKey);
    } catch {
      // Sin almacenamiento disponible la sincronización vuelve a empezar en la próxima carga (el merge lo tolera).
    }
  }
}
