"use client";

import {
  BookOpen,
  Dumbbell,
  FileText,
  Hash,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { searchEntries, type SearchEntry, type SearchEntryKind } from "../domain/search";

const KIND_META: Readonly<Record<SearchEntryKind, { label: string; icon: LucideIcon }>> = {
  page: { label: "Sección", icon: LayoutGrid },
  lesson: { label: "Lección", icon: BookOpen },
  section: { label: "Apartado", icon: Hash },
  course: { label: "Curso", icon: BookOpen },
  path: { label: "Ruta", icon: MapIcon },
  cheatsheet: { label: "Cheatsheet", icon: FileText },
  pattern: { label: "Patrón", icon: Layers },
  practice: { label: "Práctica", icon: Dumbbell },
};

/**
 * Buscador global (Ctrl/Cmd + K). Accesible como combobox: el foco queda en el campo y la opción activa se
 * comunica con `aria-activedescendant`. Flechas para moverse, Enter para abrir, Escape para cerrar.
 */
export function CommandPalette({ entries }: { entries: readonly SearchEntry[] }) {
  const router = useRouter();
  const listId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchEntries(entries, query, 12), [entries, query]);

  const open = useCallback(() => {
    if (dialogRef.current?.open) return;
    setQuery("");
    setActive(0);
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  }, []);
  const close = () => dialogRef.current?.close();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const go = (entry: SearchEntry | undefined) => {
    if (!entry) return;
    close();
    router.push(entry.href);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="border-border bg-surface text-muted hover:text-foreground flex h-9 w-full max-w-xs items-center gap-2 rounded-md border px-3 text-sm transition-colors"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search aria-hidden className="size-4" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="border-border hidden rounded border px-1.5 font-mono text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Buscador"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="border-border bg-surface text-foreground mx-auto mt-[12vh] w-[min(40rem,calc(100vw-2rem))] rounded-xl border p-0 shadow-2xl backdrop:bg-black/50"
      >
        <div className="border-border flex items-center gap-3 border-b px-4">
          <Search aria-hidden className="text-muted size-4 shrink-0" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Buscar lecciones, patrones y prácticas"
            placeholder="Buscar lecciones, temas, cursos…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            className="h-12 flex-1 bg-transparent text-base outline-none"
          />
          <kbd className="border-border text-muted rounded border px-1.5 font-mono text-[10px]">Esc</kbd>
        </div>

        <ul id={listId} role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim() !== "" && results.length === 0 && (
            <li className="text-muted px-3 py-6 text-center text-sm">Sin resultados para «{query}».</li>
          )}
          {query.trim() === "" && (
            <li className="text-muted px-3 py-6 text-center text-sm">
              Escribí para buscar en lecciones, apartados, cursos, rutas, cheatsheets, patrones y prácticas.
            </li>
          )}
          {results.map((result, index) => {
            const meta = KIND_META[result.kind];
            const Icon = meta.icon;
            return (
              <li
                key={result.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(result)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2",
                  index === active ? "bg-accent/12" : "hover:bg-surface-2",
                )}
              >
                <Icon aria-hidden className="text-muted size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block truncate text-sm font-medium">{result.title}</span>
                  <span className="text-muted block truncate text-xs">{result.context}</span>
                </span>
                <span className="text-muted shrink-0 text-[10px] tracking-wide uppercase">{meta.label}</span>
              </li>
            );
          })}
        </ul>
      </dialog>
    </>
  );
}
