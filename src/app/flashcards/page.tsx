import type { Metadata } from "next";
import { getDecks } from "@/infrastructure/composition/flashcards";
import { getCatalog } from "@/infrastructure/composition/learning";
import { buildLessonIndex } from "@/infrastructure/composition/lesson-index";
import { FlashcardsSession } from "@/modules/flashcards/presentation/flashcards-session";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const [decks, catalog] = await Promise.all([getDecks(), getCatalog()]);
  return (
    <div className="mx-auto max-w-3xl">
      <StudyTimer />
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="text-muted mt-1">
          Repasá conceptos clave justo antes de olvidarlos. Respondé mentalmente, revelá la respuesta y
          calificá con honestidad.
        </p>
      </header>
      <FlashcardsSession decks={decks} lessons={buildLessonIndex(catalog)} />
    </div>
  );
}
