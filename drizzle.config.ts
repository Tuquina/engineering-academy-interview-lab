import { defineConfig } from "drizzle-kit";

/** Generación de migraciones: `docker compose run --rm app pnpm db:generate`. Las migraciones se versionan en `drizzle/`. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://eal:eal@db:5432/eal" },
  strict: true,
});
