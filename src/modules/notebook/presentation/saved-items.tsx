"use client";

import { Bookmark, NotebookPen } from "lucide-react";
import Link from "next/link";
import type { LessonIndex } from "@/shared/kernel/lesson-link";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { listBookmarks, listNotes } from "../domain/notebook";
import { useNotebookState } from "./notebook-context";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

/**
 * Marcadores y notas del usuario. Las entradas cuya lección ya no existe en el catálogo se informan en lugar de
 * ocultarse en silencio, para no perder notas si se renombra o retira contenido.
 */
export function SavedItems({ lessons }: { lessons: LessonIndex }) {
  const state = useNotebookState();
  const bookmarks = listBookmarks(state);
  const notes = listNotes(state);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <CardTitle className="flex items-center gap-2">
          <Bookmark aria-hidden className="text-accent size-4" /> Lecciones guardadas
        </CardTitle>
        {bookmarks.length === 0 ? (
          <CardDescription>
            Todavía no guardaste lecciones. Usá el botón «Guardar» en el encabezado de cualquier lección.
          </CardDescription>
        ) : (
          <ul className="flex flex-col gap-1">
            {bookmarks.map((bookmark) => {
              const lesson = lessons[bookmark.lessonId];
              return (
                <li key={bookmark.lessonId}>
                  {lesson ? (
                    <Link href={lesson.href} className="hover:bg-surface-2 block rounded-md px-2 py-1.5">
                      <span className="text-foreground block text-sm font-medium">{lesson.title}</span>
                      <span className="text-muted text-xs">{lesson.courseTitle}</span>
                    </Link>
                  ) : (
                    <span className="text-muted block px-2 py-1.5 text-sm">
                      Lección no disponible ({bookmark.lessonId})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle className="flex items-center gap-2">
          <NotebookPen aria-hidden className="text-accent size-4" /> Mis notas
        </CardTitle>
        {notes.length === 0 ? (
          <CardDescription>Las notas que escribas al final de cada lección aparecen acá.</CardDescription>
        ) : (
          <ul className="flex flex-col gap-4">
            {notes.map((note) => {
              const lesson = lessons[note.lessonId];
              return (
                <li key={note.lessonId} className="border-border border-l-2 pl-3">
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    {lesson ? (
                      <Link
                        href={lesson.href}
                        className="text-foreground text-sm font-medium hover:underline"
                      >
                        {lesson.title}
                      </Link>
                    ) : (
                      <span className="text-muted text-sm">Lección no disponible ({note.lessonId})</span>
                    )}
                    <span className="text-muted text-xs">{dateFormat.format(new Date(note.updatedAt))}</span>
                  </div>
                  <p className="text-foreground/90 line-clamp-6 text-sm whitespace-pre-wrap">{note.text}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
