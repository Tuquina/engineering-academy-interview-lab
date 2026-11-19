import { deepEqual, mergeThreeWay, type Json } from "../domain/three-way-merge";
import type { StoredDocument, SyncStoreKey } from "./user-documents";

/**
 * Motor de sincronización del cliente para un store. No conoce `localStorage` ni HTTP: recibe puertos.
 *
 * Estado que recuerda (`SyncMeta`): para qué usuario sincronizó, la revisión del servidor y el **ancestro común**
 * (`base`), que permite el merge de tres vías.
 */

export interface SyncMeta {
  readonly userId: string;
  readonly revision: number;
  readonly base: unknown;
}

export interface RemoteGateway {
  pullAll(): Promise<Record<string, StoredDocument>>;
  push(
    key: SyncStoreKey,
    baseRevision: number,
    data: unknown,
  ): Promise<{ ok: true; revision: number } | { ok: false; current: StoredDocument | null }>;
}

export interface LocalReplica<T> {
  readonly key: SyncStoreKey;
  readonly empty: T;
  getState(): T;
  /** Reemplaza el estado local sin disparar una nueva subida. */
  applyRemote(state: T): void;
  /** Valida un estado combinado; `null` si quedó inválido. */
  parse(data: unknown): T | null;
  readMeta(): SyncMeta | null;
  writeMeta(meta: SyncMeta | null): void;
}

const MAX_CONFLICT_RETRIES = 3;

/**
 * Primera sincronización de un store con la cuenta (o al volver a abrir la app):
 * - Si lo local pertenece a otro usuario, se descarta (nunca se mezclan datos de cuentas distintas).
 * - Si lo local es de invitado (sin meta), se combina con la cuenta usando el estado vacío como ancestro.
 */
export async function reconcile<T>(
  replica: LocalReplica<T>,
  userId: string,
  remote: StoredDocument | null,
  gateway: RemoteGateway,
) {
  let meta = replica.readMeta();
  if (meta && meta.userId !== userId) {
    replica.applyRemote(replica.empty);
    meta = null;
  }
  const base = (meta?.base ?? replica.empty) as Json;
  const local = replica.getState() as Json;
  const merged = remote ? combine(replica, base, local, remote.data as Json) : replica.getState();
  if (!deepEqual(merged, local)) replica.applyRemote(merged);
  replica.writeMeta({ userId, revision: remote?.revision ?? 0, base: remote?.data ?? replica.empty });
  await push(replica, gateway);
}

/** Sube el estado local si cambió desde la última sincronización; ante conflicto combina y reintenta. */
export async function push<T>(
  replica: LocalReplica<T>,
  gateway: RemoteGateway,
): Promise<"unchanged" | "pushed"> {
  for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
    const meta = replica.readMeta();
    if (!meta) return "unchanged";
    const state = replica.getState();
    if (deepEqual(state, meta.base)) return "unchanged";
    const result = await gateway.push(replica.key, meta.revision, state);
    if (result.ok) {
      replica.writeMeta({ ...meta, revision: result.revision, base: state });
      return "pushed";
    }
    // Otro dispositivo escribió antes: se combina contra lo que hay en el servidor y se vuelve a intentar.
    const current = result.current;
    const remoteData = (current?.data ?? replica.empty) as Json;
    const merged = combine(replica, meta.base as Json, state as Json, remoteData);
    replica.applyRemote(merged);
    replica.writeMeta({ ...meta, revision: current?.revision ?? 0, base: remoteData });
  }
  throw new Error(
    `No se pudo sincronizar "${replica.key}" después de ${MAX_CONFLICT_RETRIES} conflictos seguidos.`,
  );
}

/** Trae cambios de otros dispositivos (por ejemplo, al volver a la pestaña) y los combina con lo local. */
export async function pull<T>(replica: LocalReplica<T>, remote: StoredDocument | null) {
  const meta = replica.readMeta();
  if (!meta || !remote || remote.revision === meta.revision) return;
  const local = replica.getState() as Json;
  const merged = combine(replica, meta.base as Json, local, remote.data as Json);
  if (!deepEqual(merged, local)) replica.applyRemote(merged);
  replica.writeMeta({ ...meta, revision: remote.revision, base: remote.data });
}

function combine<T>(replica: LocalReplica<T>, base: Json, local: Json, remote: Json): T {
  // Si el resultado del merge no cumple el esquema (caso extremo), se prefiere el servidor: nunca se guarda basura.
  return replica.parse(mergeThreeWay(base, local, remote)) ?? replica.parse(remote) ?? replica.empty;
}

/** Contrato que usa la interfaz para controlar la sincronización (lo implementa `SyncManager`). */
export interface SyncController {
  getSnapshot(): {
    readonly phase: "guest" | "syncing" | "synced" | "error";
    readonly userId: string | null;
    readonly lastSyncedAt: string | null;
    readonly error: string | null;
  };
  subscribe(listener: () => void): () => void;
  attach(userId: string): Promise<void>;
  refresh(): Promise<void>;
  flush(): Promise<void>;
  detach(clearLocal: boolean): void;
}
