"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalize } from "@/modules/search/domain/search";
import { Badge } from "@/shared/ui/badge";
import { FavoriteCheatsheetButton } from "./favorite-cheatsheet-button";
import { useNotebookState } from "./notebook-context";

export interface CheatsheetCard {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
}

/** Listado de cheatsheets con filtro por texto y por favoritas. Las favoritas se muestran primero. */
export function CheatsheetList({ sheets }: { sheets: readonly CheatsheetCard[] }) {
  const favorites = useNotebookState().favoriteCheatsheets;
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return sheets
      .filter((s) => !onlyFavorites || favorites[s.slug])
      .filter((s) => q === "" || normalize([s.title, s.description, ...s.tags].join(" ")).includes(q))
      .sort((a, b) => Number(Boolean(favorites[b.slug])) - Number(Boolean(favorites[a.slug])));
  }, [sheets, query, onlyFavorites, favorites]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex-1">
          <span className="sr-only">Filtrar cheatsheets</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por tema o etiqueta…"
            className="border-border bg-surface w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-muted flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyFavorites}
            onChange={(e) => setOnlyFavorites(e.target.checked)}
          />
          Sólo favoritas
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted py-8 text-center text-sm">
          {onlyFavorites
            ? "Todavía no marcaste cheatsheets como favoritas."
            : "No hay cheatsheets que coincidan."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((sheet) => (
            <li key={sheet.slug} className="relative">
              <Link
                href={`/cheatsheets/${sheet.slug}`}
                className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-2 rounded-lg border p-5 pr-12 transition-colors"
              >
                <h2 className="text-foreground font-semibold">{sheet.title}</h2>
                <p className="text-muted flex-1 text-sm">{sheet.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {sheet.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </Link>
              <span className="absolute top-3 right-3">
                <FavoriteCheatsheetButton slug={sheet.slug} title={sheet.title} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
