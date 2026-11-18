import type { CatalogData } from "../domain/catalog-types";

/**
 * Puerto de salida: fuente de contenido educativo.
 *
 * Implementaciones previstas: sistema de archivos (contenido versionado en el repositorio) y, en la Fase 6,
 * base de datos para contenido personalizado. Las implementaciones deben validar sus datos y fallar con un
 * error descriptivo ante contenido mal formado.
 */
export interface ContentSource {
  /** Carga todos los metadatos del catálogo (sin cuerpos de lecciones). */
  loadCatalogData(): Promise<CatalogData>;

  /**
   * Devuelve el cuerpo MDX de una lección, sin frontmatter.
   * @returns `null` si la lección no existe en esta fuente.
   */
  loadLessonBody(lessonId: string): Promise<string | null>;
}
