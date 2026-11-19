import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "../database/database";

/**
 * Conexión a PostgreSQL del servidor. `DATABASE_URL` es opcional: sin ella la plataforma funciona en modo invitado
 * y las funciones que necesitan persistencia responden 503 o se muestran deshabilitadas.
 *
 * El pool se guarda en `globalThis` para que el recargado en caliente del servidor de desarrollo no abra pools nuevos.
 * Con Vercel y un PostgreSQL administrado (Neon o Supabase) se usa la URL del pooler (PgBouncer) y un pool chico por
 * instancia.
 */
const globalForDb = globalThis as unknown as { __ealPool?: Pool; __ealDb?: Database };

export function isPersistenceEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabase(): Database | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!globalForDb.__ealDb) {
    globalForDb.__ealPool ??= new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    globalForDb.__ealDb = drizzle(globalForDb.__ealPool);
  }
  return globalForDb.__ealDb;
}
