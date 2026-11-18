import path from "node:path";
import { cache } from "react";
import type { Deck } from "@/modules/flashcards/domain/deck";
import { loadDecks } from "@/modules/flashcards/infrastructure/file-system-deck-source";

let productionDecks: Promise<Deck[]> | null = null;

/** Mazos de flashcards del repositorio. Se cachean por proceso en producción y se releen en desarrollo. */
export const getDecks = cache((): Promise<Deck[]> => {
  const root = path.join(process.cwd(), "content");
  if (process.env.NODE_ENV !== "production") return loadDecks(root);
  productionDecks ??= loadDecks(root).catch((error: unknown) => {
    productionDecks = null;
    throw error;
  });
  return productionDecks;
});
