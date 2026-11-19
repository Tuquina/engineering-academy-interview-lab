"use client";

import { RotateCw } from "lucide-react";
import { useState } from "react";
import { InlineCodeText } from "@/shared/ui/inline-code-text";
import type { Flashcard } from "../domain/custom-content";

/** Tarjetas del curso personalizado: se dan vuelta para autoevaluarse (sin planificación de repaso espaciado). */
export function FlashcardList({ cards }: { cards: readonly Flashcard[] }) {
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  return (
    <section aria-labelledby="flashcards-del-curso" className="mb-8">
      <h2 id="flashcards-del-curso" className="text-foreground mb-3 text-xl font-semibold tracking-tight">
        Flashcards del curso
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const open = flipped.has(card.id);
          return (
            <li key={card.id}>
              <button
                type="button"
                aria-pressed={open}
                onClick={() =>
                  setFlipped((s) => {
                    const next = new Set(s);
                    if (open) next.delete(card.id);
                    else next.add(card.id);
                    return next;
                  })
                }
                className="border-border bg-surface hover:border-accent/50 flex min-h-28 w-full flex-col gap-2 rounded-lg border p-4 text-left"
              >
                <span className="text-muted text-xs">{open ? "Respuesta" : "Pregunta"}</span>
                <span className="text-foreground text-sm">
                  <InlineCodeText text={open ? card.back : card.front} />
                </span>
                <span className="text-muted mt-auto flex items-center gap-1 text-xs">
                  <RotateCw aria-hidden className="size-3" /> {open ? "Ver pregunta" : "Ver respuesta"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
