import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/**
 * Aplica las migraciones versionadas de `drizzle/`. Sin DATABASE_URL no hace nada: la plataforma funciona en modo
 * invitado. Las migraciones se registran en `drizzle.__drizzle_migrations`, así que correrlo varias veces es seguro.
 */
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.log("DATABASE_URL vacía: se omiten las migraciones (modo invitado).");
  process.exit(0);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migraciones aplicadas.");
} finally {
  await pool.end();
}
