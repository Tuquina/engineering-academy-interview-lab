import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/**
 * Tipo común de base de datos para los repositorios: lo implementan tanto `node-postgres` (servidor) como PGlite
 * (tests de integración en proceso). Los repositorios usan el query builder, no consultas relacionales, así que no
 * necesitan el esquema como parámetro de tipo.
 */
export type Database = PgDatabase<PgQueryResultHKT>;
