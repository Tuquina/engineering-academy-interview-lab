/** Hoja de referencia rápida. El cuerpo MDX se carga por separado. */
export interface CheatsheetMeta {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
  readonly tags: readonly string[];
  /** Lecciones donde se explica cada tema en profundidad. */
  readonly relatedLessons: readonly string[];
}
