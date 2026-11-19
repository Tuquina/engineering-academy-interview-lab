import { mergeThreeWay, type Json } from "../domain/three-way-merge";
import { SYNC_STORE_KEYS, isSyncStoreKey, type SyncStoreKey } from "./user-documents";

/**
 * Copia de seguridad de los datos del usuario (progreso, notas, flashcards, laboratorios…) en un JSON versionado.
 * Funciona en modo invitado y con cuenta. Importar **combina** con lo existente en lugar de reemplazar: importar dos
 * veces el mismo archivo no duplica nada.
 */

export const BACKUP_FORMAT = "eal-user-data";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  readonly exportedAt: string;
  readonly stores: Partial<Record<SyncStoreKey, unknown>>;
}

export interface BackupStore {
  readonly key: SyncStoreKey;
  readonly empty: unknown;
  getState(): unknown;
  parse(data: unknown): unknown;
  /** Aplica el estado importado como un cambio local (se sincroniza si hay sesión). */
  replace(state: unknown): void;
}

export interface UserDataBackupPort {
  exportData(now: Date): BackupFile;
  importData(file: unknown): { imported: SyncStoreKey[]; invalid: string[] };
}

export class UserDataBackup implements UserDataBackupPort {
  constructor(private readonly stores: readonly BackupStore[]) {}

  exportData(now: Date): BackupFile {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      stores: Object.fromEntries(this.stores.map((s) => [s.key, s.getState()])),
    };
  }

  importData(file: unknown) {
    if (
      typeof file !== "object" ||
      file === null ||
      (file as BackupFile).format !== BACKUP_FORMAT ||
      (file as BackupFile).version !== BACKUP_VERSION
    ) {
      throw new Error(`El archivo no es una copia de "${BACKUP_FORMAT}" versión ${BACKUP_VERSION}.`);
    }
    const imported: SyncStoreKey[] = [];
    const invalid: string[] = [];
    const stores = (file as BackupFile).stores ?? {};
    for (const [key, data] of Object.entries(stores)) {
      const store = this.stores.find((s) => s.key === key);
      if (!isSyncStoreKey(key) || !store) {
        invalid.push(key);
        continue;
      }
      const incoming = store.parse(data);
      if (incoming === null) {
        invalid.push(key);
        continue;
      }
      // Ancestro vacío: lo que sólo está en el archivo se agrega, lo que sólo está acá se conserva.
      const merged = store.parse(
        mergeThreeWay(store.empty as Json, store.getState() as Json, incoming as Json),
      );
      if (merged === null) {
        invalid.push(key);
        continue;
      }
      store.replace(merged);
      imported.push(key);
    }
    return { imported, invalid };
  }
}

export const BACKUP_STORE_LABELS: Record<SyncStoreKey, string> = {
  progress: "Progreso y respuestas",
  notebook: "Notas y guardados",
  flashcards: "Flashcards",
  preferences: "Preferencias",
  practice: "Challenges y borradores",
  studio: "System Design Studio",
  interviews: "Interview Arena",
  agentLab: "AI Agents Lab",
};

export { SYNC_STORE_KEYS };
