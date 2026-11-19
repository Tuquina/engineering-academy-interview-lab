import type { ExternalStore } from "@/shared/kernel/external-store";
import { pull, push, reconcile, type RemoteGateway, type SyncController } from "../application/sync-engine";
import type { StoredDocument, SyncStoreKey } from "../application/user-documents";
import type { SyncedStore } from "./synced-store";

export interface SyncStatus {
  readonly phase: "guest" | "syncing" | "synced" | "error";
  readonly userId: string | null;
  readonly lastSyncedAt: string | null;
  readonly error: string | null;
}

const GUEST: SyncStatus = { phase: "guest", userId: null, lastSyncedAt: null, error: null };
const PUSH_DELAY_MS = 1_200;

/**
 * Coordina la sincronización de todos los stores: al iniciar sesión baja los documentos de la cuenta y combina; ante
 * cada cambio local sube con un pequeño retardo (agrupa ráfagas de cambios); al volver a la pestaña trae cambios de
 * otros dispositivos. Al cerrar sesión borra los datos de la cuenta de este navegador.
 */
export class SyncManager implements ExternalStore<SyncStatus>, SyncController {
  private status: SyncStatus = GUEST;
  private readonly listeners = new Set<() => void>();
  private readonly timers = new Map<SyncStoreKey, ReturnType<typeof setTimeout>>();
  private readonly inFlight = new Map<SyncStoreKey, Promise<unknown>>();
  private userId: string | null = null;

  constructor(
    private readonly stores: readonly SyncedStore<unknown>[],
    private readonly gateway: RemoteGateway,
  ) {}

  getSnapshot = (): SyncStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update = (): void => undefined;

  async attach(userId: string): Promise<void> {
    if (this.userId === userId) return;
    this.userId = userId;
    for (const store of this.stores) store.listen((key) => this.schedule(key));
    await this.run(async () => {
      const remote = await this.gateway.pullAll();
      for (const store of this.stores)
        await reconcile(store, userId, remote[store.key] ?? null, this.gateway);
    });
  }

  /** Trae cambios remotos (por ejemplo, al volver a la pestaña). */
  async refresh(): Promise<void> {
    if (!this.userId) return;
    await this.run(async () => {
      await this.flush();
      const remote = await this.gateway.pullAll();
      for (const store of this.stores) await pull(store, remote[store.key] ?? null);
    });
  }

  /** Sube ya los cambios pendientes. */
  async flush(): Promise<void> {
    const pending = [...this.timers.keys()];
    for (const key of pending) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    await Promise.all(pending.map((key) => this.pushKey(key)));
    await Promise.all(this.inFlight.values());
  }

  /** Cierre de sesión: deja de sincronizar y, si se pide, borra de este navegador los datos de la cuenta. */
  detach(clearLocal: boolean): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const store of this.stores) {
      store.listen(null);
      // Sólo se borra lo que pertenecía a una cuenta: los datos de invitado (sin meta) no se tocan.
      if (clearLocal && store.readMeta()) {
        store.applyRemote(store.empty);
        store.writeMeta(null);
      }
    }
    this.userId = null;
    this.setStatus(GUEST);
  }

  private schedule(key: SyncStoreKey) {
    if (!this.userId) return;
    clearTimeout(this.timers.get(key));
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        void this.run(() => this.pushKey(key));
      }, PUSH_DELAY_MS),
    );
  }

  private pushKey(key: SyncStoreKey): Promise<unknown> {
    const store = this.stores.find((s) => s.key === key);
    if (!store) return Promise.resolve();
    // Un solo envío a la vez por store; si hay uno en curso, el siguiente espera y sube el estado más nuevo.
    const previous = this.inFlight.get(key) ?? Promise.resolve();
    const next = previous
      .then(() => push(store, this.gateway))
      .finally(() => {
        if (this.inFlight.get(key) === next) this.inFlight.delete(key);
      });
    this.inFlight.set(key, next);
    return next;
  }

  private async run(task: () => Promise<unknown>) {
    const userId = this.userId;
    this.setStatus({ ...this.status, phase: "syncing", userId, error: null });
    try {
      await task();
      if (this.userId === userId) {
        this.setStatus({ phase: "synced", userId, lastSyncedAt: new Date().toISOString(), error: null });
      }
    } catch (cause) {
      if (this.userId === userId) {
        this.setStatus({
          ...this.status,
          phase: "error",
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
}

/** Gateway HTTP hacia `/api/sync`. */
export class HttpSyncGateway implements RemoteGateway {
  async pullAll(): Promise<Record<string, StoredDocument>> {
    const response = await fetch("/api/sync", { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo leer la cuenta (HTTP ${response.status}).`);
    return ((await response.json()) as { documents: Record<string, StoredDocument> }).documents;
  }

  async push(key: SyncStoreKey, baseRevision: number, data: unknown) {
    const response = await fetch(`/api/sync/${key}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseRevision, data }),
    });
    if (response.status === 409) {
      return {
        ok: false as const,
        current: ((await response.json()) as { current: StoredDocument | null }).current,
      };
    }
    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(detail?.error ?? `No se pudo guardar "${key}" (HTTP ${response.status}).`);
    }
    return { ok: true as const, revision: ((await response.json()) as { revision: number }).revision };
  }
}
