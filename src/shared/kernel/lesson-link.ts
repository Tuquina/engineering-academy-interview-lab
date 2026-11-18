/**
 * Datos mínimos y serializables para enlazar una lección desde componentes de cliente de cualquier módulo
 * (dashboard, guardados, flashcards, estadísticas) sin pasarles el catálogo completo.
 */
export interface LessonLink {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly courseTitle: string;
  readonly estimatedMinutes: number;
}

export type LessonIndex = Readonly<Record<string, LessonLink>>;
