import { CheckCircle2, Clock, Gauge, MessageCircleQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArchitectureContent } from "@/infrastructure/composition/architecture";
import { getCaseStudies } from "@/infrastructure/composition/system-design";
import { InteractiveDiagram } from "@/modules/architecture/presentation/interactive-diagram";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { SIMULATIONS } from "@/modules/system-design/domain/simulations/catalog";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getCaseStudies()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = (await getCaseStudies()).find((c) => c.slug === slug);
  return study ? { title: study.title, description: study.summary } : {};
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const [studies, architecture] = await Promise.all([getCaseStudies(), getArchitectureContent()]);
  const study = studies.find((c) => c.slug === slug);
  if (!study) notFound();
  const diagram = architecture.diagrams.find((d) => d.id === study.diagram);
  if (!diagram) notFound();
  const body = await renderLessonBody(study.body);
  const patterns = architecture.patterns.filter((p) => study.relatedPatterns.includes(p.slug));
  const simulations = SIMULATIONS.filter((s) => study.relatedSimulations.includes(s.slug));
  const index = studies.indexOf(study);
  const next = studies[index + 1];

  return (
    <div className="mx-auto max-w-6xl">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/system-design" className="hover:text-foreground">
          System Design Studio
        </Link>
        <span aria-hidden> / </span>
        <span>Casos clásicos</span>
      </nav>
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{study.title}</h1>
        <p className="text-muted mt-2 max-w-3xl">{study.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="violet">Caso de estudio</Badge>
          <Badge tone={DIFFICULTY_TONES[study.difficulty]}>{DIFFICULTY_LABELS[study.difficulty]}</Badge>
          <Badge>
            <Clock aria-hidden className="size-3" /> {study.durationMinutes} min de entrevista
          </Badge>
          {study.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </header>

      <section aria-labelledby="requerimientos" className="mb-6 grid gap-4 md:grid-cols-2">
        <h2 id="requerimientos" className="sr-only">
          Requerimientos
        </h2>
        {[
          { title: "Requerimientos funcionales", items: study.functionalRequirements },
          { title: "Requerimientos no funcionales", items: study.nonFunctionalRequirements },
        ].map((group) => (
          <div key={group.title} className="border-border bg-surface rounded-lg border p-4">
            <h3 className="text-foreground mb-2 text-sm font-semibold">{group.title}</h3>
            <ul className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li key={item} className="text-foreground flex gap-2 text-sm">
                  <CheckCircle2 aria-hidden className="text-accent mt-0.5 size-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="estimaciones" className="mb-8">
        <h2 id="estimaciones" className="text-foreground mb-3 flex items-center gap-2 text-xl font-semibold">
          <Gauge aria-hidden className="text-accent size-5" /> Estimaciones
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {study.estimates.map((estimate) => (
            <li key={estimate.label} className="border-border bg-surface rounded-lg border p-4">
              <p className="text-muted text-xs font-medium tracking-wide uppercase">{estimate.label}</p>
              <p className="text-foreground mt-1 text-xl font-semibold tabular-nums">{estimate.value}</p>
              <p className="text-muted mt-1 text-xs">{estimate.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="arquitectura" className="mb-8">
        <h2 id="arquitectura" className="text-foreground mb-1 text-xl font-semibold">
          Arquitectura
        </h2>
        <p className="text-muted mb-3 text-sm">
          Los puntos que recorren las conexiones muestran la dirección del flujo. Tocá{" "}
          <span className="text-foreground font-medium">Reproducir</span> para seguir el recorrido paso a paso
          (escritura, lectura y fallas) o hacé clic en un componente para ver su responsabilidad.
        </p>
        <InteractiveDiagram diagram={diagram} />
      </section>

      <div className="prose prose-headings:tracking-tight reading-scale max-w-none">{body}</div>

      <section aria-labelledby="seguimiento" className="border-border bg-surface mt-10 rounded-lg border p-5">
        <h2 id="seguimiento" className="text-foreground mb-3 flex items-center gap-2 text-lg font-semibold">
          <MessageCircleQuestion aria-hidden className="text-accent size-5" /> Preguntas de seguimiento
        </h2>
        <ul className="text-foreground list-disc pl-5 text-sm">
          {study.followUps.map((question) => (
            <li key={question} className="mb-1">
              {question}
            </li>
          ))}
        </ul>
        {(patterns.length > 0 || simulations.length > 0) && (
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {patterns.map((p) => (
              <Link key={p.slug} href={`/patterns/${p.slug}`} className="text-accent hover:underline">
                Patrón: {p.title}
              </Link>
            ))}
            {simulations.map((s) => (
              <Link
                key={s.slug}
                href={`/system-design/simulators/${s.slug}`}
                className="text-accent hover:underline"
              >
                Simulador: {s.title}
              </Link>
            ))}
          </p>
        )}
      </section>

      {next && (
        <p className="mt-6 text-right text-sm">
          <Link href={`/system-design/cases/${next.slug}`} className="text-accent hover:underline">
            Siguiente caso: {next.title} →
          </Link>
        </p>
      )}
    </div>
  );
}
