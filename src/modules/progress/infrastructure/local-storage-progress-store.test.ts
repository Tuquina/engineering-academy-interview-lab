import { describe, expect, it, vi } from "vitest";
import { EMPTY_PROGRESS, completeLesson } from "../domain/progress";
import {
  LocalStorageProgressStore,
  PROGRESS_STORAGE_KEY,
  parseStoredProgress,
} from "./local-storage-progress-store";

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const now = new Date("2026-11-18T12:00:00.000Z");

describe("LocalStorageProgressStore", () => {
  it("persiste las actualizaciones y notifica a los suscriptores", () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageProgressStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((s) => completeLesson(s, "a", now));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().lessons.a?.status).toBe("completed");
    expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? "{}")).toMatchObject({ schemaVersion: 1 });
  });

  it("devuelve la misma referencia mientras el contenido no cambie (requisito de useSyncExternalStore)", () => {
    const store = new LocalStorageProgressStore(new MemoryStorage());
    store.update((s) => completeLesson(s, "a", now));
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("no escribe ni notifica si la transformación no cambia el estado", () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageProgressStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => s);
    expect(listener).not.toHaveBeenCalled();
    expect(storage.data.size).toBe(0);
  });

  it("mantiene el estado en memoria si el almacenamiento falla", () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const store = new LocalStorageProgressStore(failing);
    store.update((s) => completeLesson(s, "a", now));
    expect(store.getSnapshot().lessons.a?.status).toBe("completed");
  });
});

describe("parseStoredProgress", () => {
  it("trata datos ausentes, corruptos o de otra versión como estado vacío", () => {
    expect(parseStoredProgress(null)).toBe(EMPTY_PROGRESS);
    expect(parseStoredProgress("{no es json")).toBe(EMPTY_PROGRESS);
    expect(parseStoredProgress(JSON.stringify({ schemaVersion: 99, lessons: {} }))).toBe(EMPTY_PROGRESS);
    expect(
      parseStoredProgress(JSON.stringify({ schemaVersion: 1, lessons: { a: { status: "hacked" } } })),
    ).toBe(EMPTY_PROGRESS);
  });
});
