import path from "node:path";
import { cache } from "react";
import { LearningQueries } from "@/modules/learning/application/learning-queries";
import type { Catalog } from "@/modules/learning/domain/catalog";
import { FileSystemContentSource } from "@/modules/learning/infrastructure/file-system-content-source";

/**
 * Raíz de composición del módulo `learning` para el servidor.
 *
 * Es el único lugar que conoce qué adaptador concreto se usa. En producción el catálogo se carga una vez por
 * proceso; en desarrollo se recarga en cada request para reflejar cambios en `content/` sin reiniciar.
 */
const queries = new LearningQueries(new FileSystemContentSource(path.join(process.cwd(), "content")));

let productionCatalog: Promise<Catalog> | null = null;

export const getLearningQueries = (): LearningQueries => queries;

/** Catálogo validado, deduplicado por request mediante `React.cache`. */
export const getCatalog = cache((): Promise<Catalog> => {
  if (process.env.NODE_ENV !== "production") return queries.getCatalog();
  productionCatalog ??= queries.getCatalog().catch((error: unknown) => {
    productionCatalog = null;
    throw error;
  });
  return productionCatalog;
});
