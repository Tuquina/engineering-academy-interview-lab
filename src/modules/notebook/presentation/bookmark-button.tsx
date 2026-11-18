"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useNotebookActions, useNotebookState } from "./notebook-context";

/** Alterna el marcador de una lección. `aria-pressed` comunica el estado a tecnologías asistivas. */
export function BookmarkButton({ lessonId }: { lessonId: string }) {
  const bookmarked = Boolean(useNotebookState().bookmarks[lessonId]);
  const { toggleBookmark } = useNotebookActions();
  return (
    <Button
      variant={bookmarked ? "success" : "secondary"}
      size="sm"
      aria-pressed={bookmarked}
      onClick={() => toggleBookmark(lessonId)}
    >
      {bookmarked ? <BookmarkCheck /> : <Bookmark />}
      {bookmarked ? "Guardada" : "Guardar"}
    </Button>
  );
}
