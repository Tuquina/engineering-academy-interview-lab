import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "@/infrastructure/database/database";

/**
 * PostgreSQL en proceso (PGlite) con las mismas migraciones versionadas que producción. Permite probar repositorios
 * y casos de uso contra un motor real sin Docker ni red. Cada llamada crea una base nueva y vacía.
 */
export async function createTestDatabase(): Promise<{ db: Database; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, "../../drizzle") });
  return { db: db as unknown as Database, close: () => client.close() };
}
