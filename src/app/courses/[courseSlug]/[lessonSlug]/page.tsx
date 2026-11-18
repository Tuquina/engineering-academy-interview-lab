import { ChevronLeft, ChevronRight, Clock, Languages } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getLearningQueries } from "@/infrastructure/composition/learning";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { extractHeadings } from "@/modules/learning/presentation/lesson/extract-headings";
import {
  FIXED_SECTION_IDS,
  InterviewQuestions,
  LearningObjectives,
  LessonReferences,
  LessonSummary,
} from "@/modules/learning/presentation/lesson/lesson-sections";
import { TableOfContents, type TocEntry } from "@/modules/learning/presentation/lesson/table-of-contents";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { LessonContextProvider } from "@/modules/learning/presentation/lesson/lesson-context";
import { BookmarkButton } from "@/modules/notebook/presentation/bookmark-button";
import { LessonNotes } from "@/modules/notebook/presentation/lesson-notes";
import { LessonProgressControls } from "@/modules/progress/presentation/lesson-progress-controls";
import {
  ReadingPositionTracker,
  ResumeReadingBanner,
} from "@/modules/progress/presentation/reading-position";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { SequentialKeyboardNav } from "@/shared/layout/keyboard-navigation";
import { Badge } from "@/shared/ui/badge";

interface LessonPageProps {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}

const LANGUAGE_LABELS = { csharp: "C#", java: "Java" } as const;

export const dynamicParams = false;

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.courses.flatMap((course) =>
    catalog
      .getLessonsOfCourse(course.id)
      .map((lesson) => ({ courseSlug: course.slug, lessonSlug: lesson.slug })),
  );
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params;
  const lesson = (await getCatalog()).getLessonBySlug(courseSlug, lessonSlug);
  return lesson ? { title: lesson.title, description: lesson.description } : {};
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseSlug, lessonSlug } = await params;
  const view = await getLearningQueries().getLessonView(await getCatalog(), courseSlug, lessonSlug);
  if (!view) notFound();

  const { course, module, lesson, adjacent } = view;
  const body = await renderLessonBody(view.body);
  const toc: TocEntry[] = [
    { id: FIXED_SECTION_IDS.objectives, text: "¿Qué vas a aprender?", depth: 2 },
    ...extractHeadings(view.body),
    ...(lesson.interviewQuestions.length > 0
      ? [{ id: FIXED_SECTION_IDS.interview, text: "Preguntas de entrevista", depth: 2 as const }]
      : []),
    { id: FIXED_SECTION_IDS.summary, text: "Resumen y puntos clave", depth: 2 },
    ...(lesson.references.length > 0
      ? [{ id: FIXED_SECTION_IDS.references, text: "Referencias", depth: 2 as const }]
      : []),
  ];
  const sections = toc.map((entry) => ({ id: entry.id, title: entry.text }));
  const previousHref = adjacent.previous ? `/courses/${course.slug}/${adjacent.previous.slug}` : undefined;
  const nextHref = adjacent.next ? `/courses/${course.slug}/${adjacent.next.slug}` : undefined;

  return (
    <div className="mx-auto flex max-w-6xl gap-10">
      <StudyTimer />
      <ReadingPositionTracker lessonId={lesson.id} sections={sections} />
      <SequentialKeyboardNav previousHref={previousHref} nextHref={nextHref} />
      <article className="min-w-0 flex-1">
        <nav aria-label="Ruta de navegación" className="text-muted mb-4 text-sm">
          <Link href="/library" className="hover:text-foreground">
            Biblioteca
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/courses/${course.slug}`} className="hover:text-foreground">
            {course.title}
          </Link>
          <span className="mx-2">/</span>
          <span>{module.title}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title}</h1>
          <p className="text-muted mt-3 text-lg">{lesson.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{DIFFICULTY_LABELS[lesson.difficulty]}</Badge>
            <Badge>
              <Clock aria-hidden className="size-3" /> {lesson.estimatedMinutes} min
            </Badge>
            {lesson.comparesWith.length > 0 && (
              <Badge tone="violet">
                <Languages aria-hidden className="size-3" /> Comparado con{" "}
                {lesson.comparesWith.map((l) => LANGUAGE_LABELS[l]).join(" y ")}
              </Badge>
            )}
            <span className="text-muted text-xs">Contenido v{lesson.version}</span>
            <span className="ml-auto">
              <BookmarkButton lessonId={lesson.id} />
            </span>
          </div>
        </header>

        <div className="flex flex-col gap-10">
          <ResumeReadingBanner lessonId={lesson.id} sections={sections} />
          <LearningObjectives objectives={lesson.objectives} />
          <LessonContextProvider lessonId={lesson.id}>
            <div className="prose prose-headings:tracking-tight reading-scale max-w-none">{body}</div>
          </LessonContextProvider>
          <InterviewQuestions questions={lesson.interviewQuestions} />
          <LessonSummary points={lesson.summary} />
          <LessonReferences references={lesson.references} />
          <LessonNotes lessonId={lesson.id} />
          <LessonProgressControls lessonId={lesson.id} />

          <nav aria-label="Lecciones del curso" className="grid gap-3 sm:grid-cols-2">
            {adjacent.previous ? (
              <Link
                href={`/courses/${course.slug}/${adjacent.previous.slug}`}
                className="border-border hover:bg-surface rounded-lg border p-4"
              >
                <span className="text-muted flex items-center gap-1 text-xs">
                  <ChevronLeft aria-hidden className="size-3" /> Anterior
                </span>
                <span className="text-foreground font-medium">{adjacent.previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {adjacent.next ? (
              <Link
                href={`/courses/${course.slug}/${adjacent.next.slug}`}
                className="border-border hover:bg-surface rounded-lg border p-4 text-right"
              >
                <span className="text-muted flex items-center justify-end gap-1 text-xs">
                  Siguiente <ChevronRight aria-hidden className="size-3" />
                </span>
                <span className="text-foreground font-medium">{adjacent.next.title}</span>
              </Link>
            ) : (
              <Link
                href={`/courses/${course.slug}`}
                className="border-border hover:bg-surface rounded-lg border p-4 text-right"
              >
                <span className="text-muted text-xs">Fin de las lecciones publicadas</span>
                <span className="text-foreground block font-medium">Volver al curso</span>
              </Link>
            )}
          </nav>
        </div>
      </article>

      <aside className="hidden w-60 shrink-0 xl:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto">
          <TableOfContents entries={toc} />
        </div>
      </aside>
    </div>
  );
}
