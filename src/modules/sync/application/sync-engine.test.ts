import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../../../../tests/support/test-database";
import { DrizzleUserRepository } from "@/modules/auth/infrastructure/drizzle-auth-repositories";
import { DrizzleUserDocumentRepository } from "../infrastructure/drizzle-user-document-repository";
import { SyncedStore } from "../infrastructure/synced-store";
import { push, reconcile, pull, type RemoteGateway } from "./sync-engine";
import { UserDataBackup } from "./user-data-backup";
import { UserDocumentService, type SyncStoreKey } from "./user-documents";

interface Notes {
  notes: Record<string, string>;
  done: string[];
}

const EMPTY: Notes = { notes: {}, done: [] };
const parse = (data: unknown): Notes | null => {
  const value = data as Notes;
  return value && typeof value.notes === "object" && Array.isArray(value.done) ? value : null;
};

/** Store en memoria con la misma interfaz que el de localStorage. */
function memoryStore(initial: Notes) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => state,
    update: (transform: (s: Notes) => Notes) => {
      state = transform(state);
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("sincronización contra PostgreSQL (PGlite)", () => {
  let close: () => Promise<void>;
  let gatewayFor: (userId: string) => RemoteGateway;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    const test = await createTestDatabase();
    close = test.close;
    const users = new DrizzleUserRepository(test.db);
    const make = (email: string) =>
      users.create(
        { email, displayName: email, passwordHash: null, githubId: null, githubLogin: null, role: "user" },
        { firstUserRole: "admin" },
      );
    userId = (await make("a@example.com")).id;
    otherUserId = (await make("b@example.com")).id;
    const service = new UserDocumentService(new DrizzleUserDocumentRepository(test.db), (_k, data) =>
      parse(data),
    );
    gatewayFor = (id) => ({
      pullAll: () => service.getAll(id),
      push: (key: SyncStoreKey, base, data) => service.put(id, key, base, data),
    });
  }, 30_000);

  afterAll(() => close());

  const device = (initial: Notes = EMPTY) =>
    new SyncedStore<Notes>("notebook", memoryStore(initial), EMPTY, parse, memoryStorage());

  it("importa los datos de invitado al iniciar sesión y los ve otro dispositivo", async () => {
    const gateway = gatewayFor(userId);
    const laptop = device({ notes: { l1: "nota local" }, done: ["l1"] });
    await reconcile(laptop, userId, (await gateway.pullAll()).notebook ?? null, gateway);
    const phone = device();
    await reconcile(phone, userId, (await gateway.pullAll()).notebook ?? null, gateway);
    expect(phone.getState()).toEqual({ notes: { l1: "nota local" }, done: ["l1"] });
  });

  it("dos dispositivos con cambios concurrentes convergen sin perder datos ni resucitar borrados", async () => {
    const gateway = gatewayFor(userId);
    const laptop = device();
    const phone = device();
    await reconcile(laptop, userId, (await gateway.pullAll()).notebook ?? null, gateway);
    await reconcile(phone, userId, (await gateway.pullAll()).notebook ?? null, gateway);

    laptop.update((s) => ({ ...s, notes: { ...s.notes, l2: "desde la laptop" } }));
    phone.update((s) => ({ notes: {}, done: [...s.done, "l9"] })); // borra la nota l1 y completa l9
    await push(laptop, gateway);
    await push(phone, gateway); // conflicto: combina con lo que subió la laptop y reintenta
    await pull(laptop, (await gateway.pullAll()).notebook ?? null);

    const expected = { notes: { l2: "desde la laptop" }, done: ["l1", "l9"] };
    expect(phone.getState()).toEqual(expected);
    expect(laptop.getState()).toEqual(expected);
  });

  it("reintentar la misma subida no duplica nada", async () => {
    const gateway = gatewayFor(userId);
    const laptop = device();
    await reconcile(laptop, userId, (await gateway.pullAll()).notebook ?? null, gateway);
    const before = (await gateway.pullAll()).notebook!;
    expect(await push(laptop, gateway)).toBe("unchanged");
    expect((await gateway.pullAll()).notebook!.revision).toBe(before.revision);
  });

  it("los datos de otra cuenta en el navegador se descartan, no se mezclan", async () => {
    const gateway = gatewayFor(userId);
    const shared = device();
    await reconcile(shared, userId, (await gateway.pullAll()).notebook ?? null, gateway);
    const other = gatewayFor(otherUserId);
    await reconcile(shared, otherUserId, (await other.pullAll()).notebook ?? null, other);
    expect(shared.getState()).toEqual(EMPTY);
    expect((await other.pullAll()).notebook).toBeUndefined();
  });

  it("importar dos veces la misma copia no duplica", () => {
    const store = device({ notes: { a: "1" }, done: ["x"] });
    const backup = new UserDataBackup([store]);
    const file = {
      format: "eal-user-data",
      version: 1,
      exportedAt: "",
      stores: { notebook: { notes: { b: "2" }, done: ["x", "y"] } },
    };
    backup.importData(file);
    backup.importData(file);
    expect(store.getState()).toEqual({ notes: { a: "1", b: "2" }, done: ["x", "y"] });
  });
});
