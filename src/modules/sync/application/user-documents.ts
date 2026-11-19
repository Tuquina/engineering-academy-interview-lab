/**
 * Caso de uso del servidor: guardar y leer los documentos sincronizados de un usuario con concurrencia optimista.
 *
 * Cada escritura dice qué revisión leyó el cliente (`baseRevision`). Si el servidor tiene otra, responde con un
 * conflicto y el documento actual: el cliente combina (merge de tres vías) y reintenta. Así dos dispositivos nunca se
 * pisan en silencio y un reintento de red no duplica nada.
 */

export const SYNC_STORE_KEYS = [
  "progress",
  "notebook",
  "flashcards",
  "preferences",
  "practice",
  "studio",
  "interviews",
  "agentLab",
] as const;

export type SyncStoreKey = (typeof SYNC_STORE_KEYS)[number];

export function isSyncStoreKey(value: string): value is SyncStoreKey {
  return (SYNC_STORE_KEYS as readonly string[]).includes(value);
}

export interface StoredDocument {
  readonly revision: number;
  readonly data: unknown;
  readonly updatedAt: string;
}

export type PutResult =
  | { readonly ok: true; readonly revision: number }
  | { readonly ok: false; readonly current: StoredDocument | null };

export interface UserDocumentRepository {
  getAll(userId: string): Promise<Record<string, StoredDocument>>;
  get(userId: string, key: SyncStoreKey): Promise<StoredDocument | null>;
  /** `expectedRevision` 0 = crear; si no coincide con la revisión guardada, no escribe. */
  put(userId: string, key: SyncStoreKey, expectedRevision: number, data: unknown): Promise<PutResult>;
}

/** Valida y normaliza un documento con el esquema del store. `null` si es inválido. */
export type DocumentValidator = (key: SyncStoreKey, data: unknown) => unknown;

export const MAX_DOCUMENT_BYTES = 2_000_000;

export class SyncError extends Error {
  constructor(
    readonly code: "invalid_document" | "too_large",
    message: string,
  ) {
    super(message);
  }
}

export class UserDocumentService {
  constructor(
    private readonly repository: UserDocumentRepository,
    private readonly validate: DocumentValidator,
  ) {}

  getAll(userId: string) {
    return this.repository.getAll(userId);
  }

  async put(userId: string, key: SyncStoreKey, baseRevision: number, data: unknown): Promise<PutResult> {
    if (JSON.stringify(data).length > MAX_DOCUMENT_BYTES) {
      throw new SyncError("too_large", "El documento supera el tamaño máximo permitido.");
    }
    const valid = this.validate(key, data);
    if (valid === null)
      throw new SyncError("invalid_document", `El documento de "${key}" no cumple el esquema.`);
    return this.repository.put(userId, key, baseRevision, valid);
  }
}
