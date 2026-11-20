import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Deck } from "../domain/deck";

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const text = z.string().trim().min(1);

const deckFileSchema = z.strictObject({
  id,
  title: text,
  description: text,
  courseId: id.nullable().default(null),
  cards: z
    .array(
      z.strictObject({
        id,
        front: text.max(500),
        back: text.max(2000),
        difficulty: z.enum(["basic", "intermediate", "advanced"]),
        tags: z.array(text).default([]),
        lessonId: id.nullable().default(null),
      }),
    )
    .min(1),
});

/**
 * Lee los mazos de `content/flashcards/*.json`. Valida cada archivo y la unicidad de IDs de mazos y tarjetas;
 * la existencia de los cursos y lecciones referenciados se verifica en el test de integridad del contenido.
 *
 * @throws {Error} con el archivo y el detalle si un mazo es inválido o hay IDs repetidos.
 */
export async function loadDecks(rootDir: string): Promise<Deck[]> {
  const dir = path.join(rootDir, "flashcards");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const decks: Deck[] = [];
  const cardIds = new Set<string>();
  for (const file of files) {
    const filePath = path.join(dir, file);
    const parsed = deckFileSchema.safeParse(JSON.parse(await readFile(filePath, "utf8")));
    if (!parsed.success) throw new Error(`Mazo inválido en ${filePath}:\n${z.prettifyError(parsed.error)}`);
    const deck = parsed.data;
    if (decks.some((d) => d.id === deck.id)) throw new Error(`ID de mazo duplicado: ${deck.id}`);
    for (const card of deck.cards) {
      if (cardIds.has(card.id)) throw new Error(`ID de tarjeta duplicado: ${card.id} (${filePath})`);
      cardIds.add(card.id);
    }
    decks.push({ ...deck, cards: deck.cards.map((card) => ({ ...card, deckId: deck.id })) });
  }
  return decks;
}
