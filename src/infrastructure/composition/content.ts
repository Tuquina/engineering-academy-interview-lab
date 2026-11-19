import {
  ContentAdminService,
  PublicContentQueries,
  type RepositoryCatalog,
} from "@/modules/content-management/application/content-admin";
import { DrizzleContentRepository } from "@/modules/content-management/infrastructure/drizzle-content-repository";
import { getDatabase } from "./database";
import { getCatalog } from "./learning";

/**
 * Raíz de composición del contenido personalizado. El catálogo del repositorio (archivos versionados) aporta las
 * áreas, cursos y lecciones existentes para validar referencias; la base guarda sólo lo creado desde la web.
 */
const repositoryCatalog: RepositoryCatalog = {
  areaIds: async () => new Set((await getCatalog()).areas.map((a) => a.id)),
  courseIds: async () => new Set((await getCatalog()).courses.map((c) => c.id)),
  lessonIds: async () => {
    const catalog = await getCatalog();
    return new Set(catalog.courses.flatMap((c) => catalog.getLessonsOfCourse(c.id).map((l) => l.id)));
  },
};

export function getContentAdmin(): ContentAdminService | null {
  const db = getDatabase();
  return db ? new ContentAdminService(new DrizzleContentRepository(db), repositoryCatalog) : null;
}

export function getPublicContent(): PublicContentQueries | null {
  const db = getDatabase();
  return db ? new PublicContentQueries(new DrizzleContentRepository(db)) : null;
}
