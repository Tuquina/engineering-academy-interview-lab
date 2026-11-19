"use client";

import Link from "next/link";
import { useState } from "react";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { Badge } from "@/shared/ui/badge";
import {
  PATTERN_CATEGORY_LABELS,
  PATTERN_KIND_LABELS,
  filterPatterns,
  type PatternCategory,
  type PatternFilters,
  type PatternKind,
  type PatternSummary,
} from "../domain/pattern";

/** Biblioteca de patrones con filtros por familia, categoría y texto. */
export function PatternCatalog({ patterns }: { patterns: readonly PatternSummary[] }) {
  const [filters, setFilters] = useState<PatternFilters>({});
  const visible = filterPatterns(patterns, filters);
  const categories = [...new Set(patterns.map((p) => p.category))];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-muted flex flex-col gap-1 text-xs">
          Buscar
          <input
            type="search"
            value={filters.query ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value || undefined }))}
            placeholder="Nombre o tema…"
            className="border-border bg-surface text-foreground w-56 rounded-md border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-muted flex flex-col gap-1 text-xs">
          Familia
          <select
            value={filters.kind ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, kind: (e.target.value as PatternKind) || undefined }))
            }
            className="border-border bg-surface text-foreground rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {(Object.keys(PATTERN_KIND_LABELS) as PatternKind[]).map((k) => (
              <option key={k} value={k}>
                {PATTERN_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted flex flex-col gap-1 text-xs">
          Categoría
          <select
            value={filters.category ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: (e.target.value as PatternCategory) || undefined }))
            }
            className="border-border bg-surface text-foreground rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {PATTERN_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-muted ml-auto text-sm" aria-live="polite">
          {visible.length} de {patterns.length} patrones
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="text-muted py-10 text-center text-sm">No hay patrones con esos filtros.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((pattern) => (
            <li key={pattern.id}>
              <Link
                href={`/patterns/${pattern.slug}`}
                className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors"
              >
                <h2 className="text-foreground font-semibold">{pattern.title}</h2>
                <p className="text-muted flex-1 text-sm">{pattern.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={pattern.kind === "design" ? "violet" : "accent"}>
                    {PATTERN_KIND_LABELS[pattern.kind]}
                  </Badge>
                  <Badge>{PATTERN_CATEGORY_LABELS[pattern.category]}</Badge>
                  <Badge>{DIFFICULTY_LABELS[pattern.difficulty]}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
