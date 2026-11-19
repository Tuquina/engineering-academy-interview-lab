import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/database/database";
import type {
  PutResult,
  StoredDocument,
  SyncStoreKey,
  UserDocumentRepository,
} from "../application/user-documents";
import { userDocuments } from "./sync-tables";

const toStored = (row: { revision: number; data: unknown; updatedAt: Date }): StoredDocument => ({
  revision: row.revision,
  data: row.data,
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * Escrituras condicionales en una sola sentencia: el `WHERE revision = esperada` (o el `ON CONFLICT DO NOTHING` al
 * crear) hace que dos escrituras concurrentes no puedan ganar ambas, sin locks explícitos.
 */
export class DrizzleUserDocumentRepository implements UserDocumentRepository {
  constructor(private readonly db: Database) {}

  async getAll(userId: string) {
    const rows = await this.db
      .select({
        key: userDocuments.storeKey,
        revision: userDocuments.revision,
        data: userDocuments.data,
        updatedAt: userDocuments.updatedAt,
      })
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId));
    return Object.fromEntries(rows.map((row) => [row.key, toStored(row)]));
  }

  async get(userId: string, key: SyncStoreKey) {
    const [row] = await this.db
      .select({
        revision: userDocuments.revision,
        data: userDocuments.data,
        updatedAt: userDocuments.updatedAt,
      })
      .from(userDocuments)
      .where(and(eq(userDocuments.userId, userId), eq(userDocuments.storeKey, key)))
      .limit(1);
    return row ? toStored(row) : null;
  }

  async put(userId: string, key: SyncStoreKey, expectedRevision: number, data: unknown): Promise<PutResult> {
    if (expectedRevision === 0) {
      const inserted = await this.db
        .insert(userDocuments)
        .values({ userId, storeKey: key, revision: 1, data })
        .onConflictDoNothing()
        .returning({ revision: userDocuments.revision });
      if (inserted[0]) return { ok: true, revision: inserted[0].revision };
      return { ok: false, current: await this.get(userId, key) };
    }
    const updated = await this.db
      .update(userDocuments)
      .set({ data, revision: sql`${userDocuments.revision} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(userDocuments.userId, userId),
          eq(userDocuments.storeKey, key),
          eq(userDocuments.revision, expectedRevision),
        ),
      )
      .returning({ revision: userDocuments.revision });
    if (updated[0]) return { ok: true, revision: updated[0].revision };
    return { ok: false, current: await this.get(userId, key) };
  }
}
