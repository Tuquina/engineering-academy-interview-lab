/**
 * Esquema completo de PostgreSQL. Cada módulo define sus tablas en su capa de infraestructura; este archivo sólo las
 * reúne para el cliente de Drizzle y para generar migraciones (`drizzle.config.ts`).
 */
export * from "../../modules/auth/infrastructure/auth-tables";
export * from "../../modules/sync/infrastructure/sync-tables";
export * from "../../modules/content-management/infrastructure/content-tables";
