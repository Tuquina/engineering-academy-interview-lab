import { describe, expect, it, vi } from "vitest";
import { LocalStorageStore } from "./local-storage-store";

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

interface Counter {
  readonly count: number;
}

const options = {
  key: "test",
  empty: { count: 0 } as Counter,
  parse: (data: unknown): Counter | null =>
    typeof data === "object" && data !== null && typeof (data as Counter).count === "number"
      ? (data as Counter)
      : null,
};

describe("LocalStorageStore", () => {
  it("persiste las actualizaciones y notifica a los suscriptores", () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageStore(options, storage);
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((s) => ({ count: s.count + 1 }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().count).toBe(1);
    expect(storage.getItem("test")).toBe('{"count":1}');
  });

  it("devuelve la misma referencia mientras el contenido no cambie", () => {
    const store = new LocalStorageStore(options, new MemoryStorage());
    store.update(() => ({ count: 5 }));
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("no escribe ni notifica si la transformación devuelve el mismo estado", () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageStore(options, storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => s);
    expect(listener).not.toHaveBeenCalled();
    expect(storage.data.size).toBe(0);
  });

  it("usa el estado vacío ante JSON corrupto o datos que el parser rechaza", () => {
    const storage = new MemoryStorage();
    storage.setItem("test", "{no es json");
    expect(new LocalStorageStore(options, storage).getSnapshot()).toBe(options.empty);
    storage.setItem("test", '{"otro":1}');
    expect(new LocalStorageStore(options, storage).getSnapshot()).toBe(options.empty);
  });

  it("mantiene el estado en memoria si el almacenamiento falla", () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const store = new LocalStorageStore(options, failing);
    store.update(() => ({ count: 3 }));
    expect(store.getSnapshot().count).toBe(3);
  });
});
