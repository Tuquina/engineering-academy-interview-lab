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
import { ReadingProgressBar } from "@/modules/learning/presentation/lesson/reading-progress-bar";
import { BookmarkButton } from "@/modules/notebook/presentation/bookmark-button";
import { LessonNotes } from "@/modules/notebook/presentation/lesson-notes";
import { MentorPanel } from "@/modules/mentor/presentation/mentor-panel";
import { LessonProgressControls } from "@/modules/progress/presentation/lesson-progress-controls";
import {
  ReadingPositionTracker,
  ResumeReadingBanner,
} from "@/modules/progress/presentation/reading-position";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { SequentialKeyboardNav } from "@/shared/layout/keyboard-navigation";
import { cn } from "@/shared/lib/cn";
import { areaToneClass } from "@/shared/ui/area-tone";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";
import { interactiveCardClass } from "@/shared/ui/card";

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

  const courseLessons = (await getCatalog()).getLessonsOfCourse(course.id);
  const position = courseLessons.findIndex((l) => l.id === lesson.id) + 1;

  return (
    <div className={cn(areaToneClass(course.areaId), "mx-auto flex max-w-6xl gap-10")}>
      <ReadingProgressBar targetId="lesson-article" />
      <StudyTimer />
      <ReadingPositionTracker lessonId={lesson.id} sections={sections} />
      <SequentialKeyboardNav previousHref={previousHref} nextHref={nextHref} />
      <article id="lesson-article" className="mx-auto max-w-3xl min-w-0 flex-1">
        <nav aria-label="Ruta de navegación" className="text-muted mb-5 text-sm">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link href="/library" className="hover:text-foreground rounded">
                Biblioteca
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link
                href={`/courses/${course.slug}`}
                className="text-area rounded font-medium hover:underline"
              >
                {course.title}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>{module.title}</li>
          </ol>
        </nav>

        <header className="mb-8">
          {position > 0 && (
            <div className="mb-3 flex items-center gap-3">
              <p className="text-area text-xs font-semibold tracking-wider uppercase">
                Lección {position} de {courseLessons.length}
              </p>
              <span aria-hidden className="bg-surface-3/70 h-1 max-w-32 flex-1 overflow-hidden rounded-full">
                <span
                  className="bg-area block h-full rounded-full"
                  style={{ width: `${(position / courseLessons.length) * 100}%` }}
                />
              </span>
            </div>
          )}
          <h1 className="text-foreground text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
            {lesson.title}
          </h1>
          <p className="text-muted mt-3 text-lg leading-relaxed">{lesson.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone={DIFFICULTY_TONES[lesson.difficulty]}>{DIFFICULTY_LABELS[lesson.difficulty]}</Badge>
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
            <div className="prose prose-headings:tracking-tight prose-p:leading-[1.75] reading-scale max-w-none">
              {body}
            </div>
          </LessonContextProvider>
          <InterviewQuestions questions={lesson.interviewQuestions} />
          <LessonSummary points={lesson.summary} />
          <LessonReferences references={lesson.references} />
          <LessonNotes lessonId={lesson.id} />
          <MentorPanel
            lesson={{
              lessonId: lesson.id,
              title: lesson.title,
              description: lesson.description,
              objectives: lesson.objectives,
              summary: lesson.summary,
            }}
          />
          <LessonProgressControls lessonId={lesson.id} />

          <nav aria-label="Lecciones del curso" className="grid gap-3 sm:grid-cols-2">
            {adjacent.previous ? (
              <Link
                href={`/courses/${course.slug}/${adjacent.previous.slug}`}
                className={cn(interactiveCardClass, "group flex flex-col gap-1 p-4")}
              >
                <span className="text-muted flex items-center gap-1 text-xs font-medium">
                  <ChevronLeft
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                  />
                  Anterior
                </span>
                <span className="text-foreground font-semibold">{adjacent.previous.title}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {adjacent.next ? (
              <Link
                href={`/courses/${course.slug}/${adjacent.next.slug}`}
                className={cn(interactiveCardClass, "group bg-area/6 flex flex-col gap-1 p-4 text-right")}
              >
                <span className="text-area flex items-center justify-end gap-1 text-xs font-semibold">
                  Siguiente
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-foreground font-semibold">{adjacent.next.title}</span>
              </Link>
            ) : (
              <Link
                href={`/courses/${course.slug}`}
                className={cn(interactiveCardClass, "flex flex-col gap-1 p-4 text-right")}
              >
                <span className="text-muted text-xs">Fin de las lecciones publicadas</span>
                <span className="text-foreground block font-semibold">Volver al curso</span>
              </Link>
            )}
          </nav>
        </div>
      </article>

      <aside className="hidden w-60 shrink-0 xl:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-4">
          <TableOfContents entries={toc} />
        </div>
      </aside>
    </div>
  );
}
