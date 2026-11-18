import { z } from "zod";
import type { ProgressStore } from "../application/progress-store";
import { EMPTY_PROGRESS, PROGRESS_SCHEMA_VERSION, type ProgressState } from "../domain/progress";

export const PROGRESS_STORAGE_KEY = "eal:progress";

const isoInstant = z.iso.datetime();

const storedProgressSchema = z.object({
  schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
  lessons: z.record(
    z.string(),
    z.object({
      status: z.enum(["in_progress", "completed"]),
      startedAt: isoInstant,
      lastVisitedAt: isoInstant,
      completedAt: isoInstant.nullable(),
    }),
  ),
});

/** Subconjunto de `Storage` que necesita el adaptador; facilita los tests sin navegador. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Implementación de {@link ProgressStore} sobre `localStorage`.
 *
 * - Valida lo leído: datos corruptos o de otra versión se tratan como estado vacío (no rompen la UI).
 * - Cachea el último valor parseado por contenido crudo, para devolver referencias estables a React.
 * - Escucha el evento `storage` para sincronizar pestañas abiertas del mismo navegador.
 * - Si el almacenamiento no está disponible (modo privado, cuota excedida), mantiene el estado en memoria.
 */
export class LocalStorageProgressStore implements ProgressStore {
  private readonly listeners = new Set<() => void>();
  private cachedRaw: string | null | undefined;
  private cachedState: ProgressState = EMPTY_PROGRESS;
  private memoryFallback: ProgressState | null = null;

  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly eventTarget: Pick<Window, "addEventListener" | "removeEventListener"> | null = null,
  ) {}

  getSnapshot = (): ProgressState => {
    if (this.memoryFallback) return this.memoryFallback;
    const raw = this.safeRead();
    if (raw !== this.cachedRaw) {
      this.cachedRaw = raw;
      this.cachedState = parseStoredProgress(raw);
    }
    return this.cachedState;
  };

  update = (transform: (state: ProgressState) => ProgressState): void => {
    const next = transform(this.getSnapshot());
    if (next === this.getSnapshot()) return;
    try {
      if (!this.storage) throw new Error("Storage no disponible");
      this.storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
      this.memoryFallback = null;
    } catch {
      this.memoryFallback = next;
    }
    this.emit();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    const onStorage = (event: Event): void => {
      if ((event as StorageEvent).key === PROGRESS_STORAGE_KEY) listener();
    };
    this.eventTarget?.addEventListener("storage", onStorage);
    return () => {
      this.listeners.delete(listener);
      this.eventTarget?.removeEventListener("storage", onStorage);
    };
  };

  private safeRead(): string | null {
    try {
      return this.storage?.getItem(PROGRESS_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/** Parsea el contenido almacenado; cualquier dato inválido produce el estado vacío. */
export function parseStoredProgress(raw: string | null): ProgressState {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const result = storedProgressSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}
