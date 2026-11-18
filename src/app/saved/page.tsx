import type { Metadata } from "next";
import { getCatalog } from "@/infrastructure/composition/learning";
import { buildLessonIndex } from "@/infrastructure/composition/lesson-index";
import { SavedItems } from "@/modules/notebook/presentation/saved-items";

export const metadata: Metadata = { title: "Guardados y notas" };

export default async function SavedPage() {
  const lessons = buildLessonIndex(await getCatalog());
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Guardados y notas</h1>
        <p className="text-muted mt-1">Tus marcadores y apuntes, guardados en este navegador.</p>
      </header>
      <SavedItems lessons={lessons} />
    </div>
  );
}
