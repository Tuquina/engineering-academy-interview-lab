import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArchitectureContent } from "@/infrastructure/composition/architecture";
import { InteractiveDiagram } from "@/modules/architecture/presentation/interactive-diagram";

interface DiagramPageProps {
  params: Promise<{ id: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getArchitectureContent()).diagrams.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: DiagramPageProps): Promise<Metadata> {
  const { id } = await params;
  const diagram = (await getArchitectureContent()).diagrams.find((d) => d.id === id);
  return diagram ? { title: diagram.title, description: diagram.description } : {};
}

export default async function DiagramPage({ params }: DiagramPageProps) {
  const { id } = await params;
  const { diagrams, patterns } = await getArchitectureContent();
  const diagram = diagrams.find((d) => d.id === id);
  if (!diagram) notFound();
  const usedBy = patterns.filter((p) => p.diagrams.includes(diagram.id));

  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 flex gap-2 text-sm">
        <Link href="/patterns" className="hover:text-foreground">
          Patrones y arquitectura
        </Link>
        <span aria-hidden>/</span>
        <Link href="/patterns/diagrams" className="hover:text-foreground">
          Diagramas
        </Link>
      </nav>
      <header className="mb-4">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{diagram.title}</h1>
        <p className="text-muted mt-2 max-w-3xl">{diagram.description}</p>
        {usedBy.length > 0 && (
          <p className="mt-2 text-sm">
            {usedBy.map((p) => (
              <Link key={p.id} href={`/patterns/${p.slug}`} className="text-accent mr-3 hover:underline">
                Patrón: {p.title}
              </Link>
            ))}
          </p>
        )}
      </header>
      <InteractiveDiagram diagram={diagram} />
    </div>
  );
}
