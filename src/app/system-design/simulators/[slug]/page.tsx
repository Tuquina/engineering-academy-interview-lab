import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { SIMULATIONS, findSimulation } from "@/modules/system-design/domain/simulations/catalog";
import { SimulatorView } from "@/modules/system-design/presentation/simulator-view";

interface SimulatorPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return SIMULATIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: SimulatorPageProps): Promise<Metadata> {
  const simulation = findSimulation((await params).slug);
  return simulation ? { title: simulation.title, description: simulation.summary } : {};
}

export default async function SimulatorPage({ params }: SimulatorPageProps) {
  const { slug } = await params;
  const simulation = findSimulation(slug);
  if (!simulation) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/system-design" className="hover:text-foreground">
          System Design Studio
        </Link>
      </nav>
      <header className="mb-5">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{simulation.title}</h1>
        <p className="text-muted mt-1">{simulation.summary}</p>
      </header>
      <SimulatorView slug={slug} />
    </div>
  );
}
