import type { Metadata } from "next";
import Link from "next/link";
import { getArchitectureContent } from "@/infrastructure/composition/architecture";
import { Badge } from "@/shared/ui/badge";

export const metadata: Metadata = { title: "Diagramas interactivos" };

export default async function DiagramsPage() {
  const { diagrams, patterns } = await getArchitectureContent();
  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/patterns" className="hover:text-foreground">
          Patrones y arquitectura
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Diagramas interactivos</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Cada diagrama se puede ampliar, mover y ver en pantalla completa. Al seleccionar un elemento se
          muestra su responsabilidad y ejemplos de implementación; varios incluyen un recorrido paso a paso.
        </p>
      </header>
      <ul className="grid gap-4 md:grid-cols-2">
        {diagrams.map((diagram) => {
          const usedBy = patterns.filter((p) => p.diagrams.includes(diagram.id));
          return (
            <li key={diagram.id}>
              <Link
                href={`/patterns/diagrams/${diagram.id}`}
                className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-2 rounded-lg border p-5 transition-colors"
              >
                <h2 className="text-foreground font-semibold">{diagram.title}</h2>
                <p className="text-muted flex-1 text-sm">{diagram.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{diagram.nodes.filter((n) => n.kind !== "boundary").length} elementos</Badge>
                  {diagram.steps.length > 0 && <Badge tone="accent">{diagram.steps.length} pasos</Badge>}
                  {usedBy.map((p) => (
                    <Badge key={p.id} tone="violet">
                      {p.title}
                    </Badge>
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
