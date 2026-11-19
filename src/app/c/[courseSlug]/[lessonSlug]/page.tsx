import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/composition/auth";
import { getPublicContent } from "@/infrastructure/composition/content";
import { customLessonId } from "@/modules/content-management/domain/custom-content";
import { CustomLessonBody } from "@/modules/content-management/presentation/custom-lesson-body";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { LessonContextProvider } from "@/modules/learning/presentation/lesson/lesson-context";
import {
  InterviewQuestions,
  LearningObjectives,
  LessonReferences,
  LessonSummary,
} from "@/modules/learning/presentation/lesson/lesson-sections";
import { LessonNotes } from "@/modules/notebook/presentation/lesson-notes";
import { LessonProgressControls } from "@/modules/progress/presentation/lesson-progress-controls";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { Badge } from "@/shared/ui/badge";

interface PageProps {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

async function loadLesson({ params, searchParams }: PageProps) {
  const [{ courseSlug, lessonSlug }, { preview }] = await Promise.all([params, searchParams]);
  const content = getPublicContent();
  if (!content) return null;
  const isAdmin = preview === "1" && (await getCurrentUser())?.role === "admin";
  const course = await content.getPublishedCourse(courseSlug, { preview: isAdmin });
  const index = course?.lessons.findIndex((l) => l.slug === lessonSlug) ?? -1;
  if (!course || index === -1) return null;
  return { course, lesson: course.lessons[index]!, index, preview: isAdmin };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const loaded = await loadLesson(props);
  return loaded ? { title: loaded.lesson.title, description: loaded.lesson.description } : {};
}

/**
 * Lección personalizada: misma estructura pedagógica y mismos componentes (objetivos, preguntas, resumen, notas y
 * progreso) que las lecciones del repositorio, sin necesidad de pantallas nuevas por temática.
 */
export default async function CustomLessonPage(props: PageProps) {
  const loaded = await loadLesson(props);
  if (!loaded) notFound();
  const { course, lesson, index, preview } = loaded;
  const lessonId = customLessonId(lesson.id);
  const query = preview ? "?preview=1" : "";
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  return (
    <div className="mx-auto max-w-4xl">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-4 text-sm">
        <Link href="/library" className="hover:text-foreground">
          Biblioteca
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/c/${course.slug}${query}`} className="hover:text-foreground">
          {course.title}
        </Link>
      </nav>
      <article>
        <header className="mb-8">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">{lesson.title}</h1>
          <p className="text-muted mt-3 text-lg">{lesson.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="violet">Contenido personalizado</Badge>
            <Badge tone="accent">{DIFFICULTY_LABELS[lesson.difficulty]}</Badge>
            <Badge>
              <Clock aria-hidden className="size-3" /> {lesson.estimatedMinutes} min
            </Badge>
            {lesson.status === "draft" ? <Badge tone="warning">Borrador</Badge> : null}
          </div>
        </header>
        <div className="flex flex-col gap-10">
          {lesson.objectives.length ? <LearningObjectives objectives={lesson.objectives} /> : null}
          <LessonContextProvider lessonId={lessonId}>
            <CustomLessonBody lessonId={lesson.id} blocks={lesson.blocks} />
          </LessonContextProvider>
          {lesson.interviewQuestions.length ? (
            <InterviewQuestions questions={lesson.interviewQuestions} />
          ) : null}
          {lesson.summary.length ? <LessonSummary points={lesson.summary} /> : null}
          {lesson.references.length ? <LessonReferences references={lesson.references} /> : null}
          <LessonNotes lessonId={lessonId} />
          <LessonProgressControls lessonId={lessonId} />
          <nav aria-label="Lecciones del curso" className="grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/c/${course.slug}/${previous.slug}${query}`}
                className="border-border hover:bg-surface rounded-lg border p-4"
              >
                <span className="text-muted text-xs">Anterior</span>
                <span className="text-foreground block font-medium">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/c/${course.slug}/${next.slug}${query}`}
                className="border-border hover:bg-surface rounded-lg border p-4 text-right"
              >
                <span className="text-muted text-xs">Siguiente</span>
                <span className="text-foreground block font-medium">{next.title}</span>
              </Link>
            ) : null}
          </nav>
        </div>
      </article>
    </div>
  );
}
