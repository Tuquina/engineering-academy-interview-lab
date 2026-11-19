import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getArchitectureContent } from "@/infrastructure/composition/architecture";
import { getCatalog } from "@/infrastructure/composition/learning";
import { buildLessonIndex } from "@/infrastructure/composition/lesson-index";
import { PATTERN_CATEGORY_LABELS, PATTERN_KIND_LABELS } from "@/modules/architecture/domain/pattern";
import { InteractiveDiagram } from "@/modules/architecture/presentation/interactive-diagram";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { Badge } from "@/shared/ui/badge";

interface PatternPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getArchitectureContent()).patterns.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PatternPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pattern = (await getArchitectureContent()).patterns.find((p) => p.slug === slug);
  return pattern ? { title: pattern.title, description: pattern.summary } : {};
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-foreground mb-3 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="text-foreground list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function PatternPage({ params }: PatternPageProps) {
  const { slug } = await params;
  const [{ patterns, diagrams }, catalog] = await Promise.all([getArchitectureContent(), getCatalog()]);
  const pattern = patterns.find((p) => p.slug === slug);
  if (!pattern) notFound();

  const body = await renderLessonBody(pattern.body);
  const lessons = buildLessonIndex(catalog);
  const relatedLessons = pattern.relatedLessons.map((id) => lessons[id]).filter((l) => l !== undefined);
  const relatedPatterns = pattern.related
    .map((s) => patterns.find((p) => p.slug === s))
    .filter((p) => p !== undefined);
  const patternDiagrams = pattern.diagrams.map((id) => diagrams.find((d) => d.id === id)!);

  return (
    <article className="mx-auto max-w-4xl">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/patterns" className="hover:text-foreground">
          Patrones y arquitectura
        </Link>
      </nav>
      <header>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{pattern.title}</h1>
        <p className="text-muted mt-2">{pattern.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={pattern.kind === "design" ? "violet" : "accent"}>
            {PATTERN_KIND_LABELS[pattern.kind]}
          </Badge>
          <Badge>{PATTERN_CATEGORY_LABELS[pattern.category]}</Badge>
          <Badge>{DIFFICULTY_LABELS[pattern.difficulty]}</Badge>
        </div>
      </header>

      <div className="reading-scale">
        <Section id="definicion" title="Definición">
          <p className="text-foreground">{pattern.definition}</p>
        </Section>
        <Section id="problema" title="Problema que resuelve">
          <p className="text-foreground">{pattern.problem}</p>
        </Section>

        {patternDiagrams.length > 0 && (
          <Section id="diagrama" title="Diagrama">
            <div className="flex flex-col gap-8">
              {patternDiagrams.map((diagram) => (
                <div key={diagram.id}>
                  <p className="text-muted mb-3 text-sm">{diagram.description}</p>
                  <InteractiveDiagram diagram={diagram} />
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="prose prose-headings:tracking-tight mt-10 max-w-none">{body}</div>

        <div className="grid gap-x-8 md:grid-cols-2">
          <Section id="beneficios" title="Beneficios">
            <List items={pattern.benefits} />
          </Section>
          <Section id="costos" title="Costos">
            <List items={pattern.costs} />
          </Section>
        </div>

        <Section id="alternativas" title="Alternativas">
          <dl className="flex flex-col gap-3">
            {pattern.alternatives.map((alt) => (
              <div key={alt.name}>
                <dt className="text-foreground font-medium">{alt.name}</dt>
                <dd className="text-muted text-sm">{alt.when}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section id="errores" title="Errores frecuentes">
          <List items={pattern.commonMistakes} />
        </Section>
        <Section id="cuando-no" title="Cuándo no conviene usarlo">
          <List items={pattern.avoidWhen} />
        </Section>

        <Section id="entrevista" title="Preguntas de entrevista">
          <ul className="flex flex-col gap-3">
            {pattern.interviewQuestions.map((q) => (
              <li key={q.question}>
                <details className="border-border bg-surface rounded-lg border">
                  <summary className="text-foreground cursor-pointer px-4 py-3 font-medium">
                    {q.question}
                  </summary>
                  <p className="text-muted border-border border-t px-4 py-3 text-sm">{q.answer}</p>
                </details>
              </li>
            ))}
          </ul>
        </Section>

        {(relatedPatterns.length > 0 || relatedLessons.length > 0) && (
          <Section id="relacionados" title="Relacionados">
            <ul className="flex flex-wrap gap-2">
              {relatedPatterns.map((p) => (
                <li key={p.id}>
                  <Link href={`/patterns/${p.slug}`} className="text-accent text-sm hover:underline">
                    Patrón: {p.title}
                  </Link>
                </li>
              ))}
              {relatedLessons.map((l) => (
                <li key={l.id}>
                  <Link href={l.href} className="text-accent text-sm hover:underline">
                    Lección: {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </article>
  );
}
