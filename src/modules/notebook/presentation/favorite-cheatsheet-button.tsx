"use client";

import { Star } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useNotebookActions, useNotebookState } from "./notebook-context";

/** Marca o desmarca una cheatsheet como favorita. */
export function FavoriteCheatsheetButton({ slug, title }: { slug: string; title: string }) {
  const favorite = Boolean(useNotebookState().favoriteCheatsheets[slug]);
  const { toggleFavoriteCheatsheet } = useNotebookActions();
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={`${favorite ? "Quitar de" : "Agregar a"} favoritas: ${title}`}
      onClick={(event) => {
        event.preventDefault();
        toggleFavoriteCheatsheet(slug);
      }}
      className="hover:bg-surface-2 rounded-md p-1.5 transition-colors"
    >
      <Star aria-hidden className={cn("size-4", favorite ? "fill-warning text-warning" : "text-muted")} />
    </button>
  );
}
