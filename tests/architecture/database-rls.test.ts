import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestDatabase } from "../support/test-database";

/**
 * Toda tabla de la aplicación debe tener RLS activo (ver `drizzle/0002_enable_rls.sql`): en Supabase el esquema
 * `public` se expone por su API de datos, y una tabla nueva sin RLS quedaría legible desde internet.
 */
describe("seguridad de la base", () => {
  it("todas las tablas del esquema public tienen Row Level Security", async () => {
    const test = await createTestDatabase();
    try {
      const result = await test.db.execute(
        sql`select c.relname as name, c.relrowsecurity as rls from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' order by 1`,
      );
      const rows = (result as unknown as { rows: { name: string; rls: boolean }[] }).rows;
      expect(rows.length).toBeGreaterThanOrEqual(9);
      expect(rows.filter((r) => !r.rls).map((r) => r.name)).toEqual([]);
    } finally {
      await test.close();
    }
  }, 30_000);
});
