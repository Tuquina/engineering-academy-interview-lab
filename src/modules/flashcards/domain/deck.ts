import type { Difficulty } from "@/modules/learning/domain/catalog-types";

/** Tarjeta de estudio. `front` y `back` son texto plano (los fragmentos entre backticks se muestran como código). */
export interface Flashcard {
  readonly id: string;
  readonly deckId: string;
  readonly front: string;
  readonly back: string;
  readonly difficulty: Difficulty;
  readonly tags: readonly string[];
  /** Lección donde se explica el concepto, para profundizar después de un fallo. */
  readonly lessonId: string | null;
}

export interface Deck {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Curso del catálogo al que pertenece el mazo (se usa como categoría); `null` en mazos transversales. */
  readonly courseId: string | null;
  readonly cards: readonly Flashcard[];
}
