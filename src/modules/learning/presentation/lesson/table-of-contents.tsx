import { cn } from "@/shared/lib/cn";

export interface TocEntry {
  readonly id: string;
  readonly text: string;
  readonly depth: 2 | 3;
}

/** Tabla de contenidos de la lección. Enlaces de ancla simples: funcionan sin JavaScript. */
export function TableOfContents({ entries }: { entries: readonly TocEntry[] }) {
  return (
    <nav aria-label="Contenido de la lección" className="text-sm">
      <p className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">En esta lección</p>
      <ol className="border-border flex flex-col gap-1.5 border-l">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={cn(
                "text-muted hover:border-accent hover:text-foreground -ml-px block border-l border-transparent py-0.5",
                entry.depth === 2 ? "pl-3" : "pl-6 text-xs",
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
