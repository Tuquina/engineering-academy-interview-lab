import { ChevronRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/infrastructure/composition/learning";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { LessonStatusIcon, ProgressSummaryBar } from "@/modules/progress/presentation/progress-badges";
import { cn } from "@/shared/lib/cn";
import { AreaIcon } from "@/shared/ui/area-icon";
import { areaToneClass } from "@/shared/ui/area-tone";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";

interface CoursePageProps {
  params: Promise<{ courseSlug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getCatalog()).courses.map((course) => ({ courseSlug: course.slug }));
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const course = (await getCatalog()).getCourseBySlug((await params).courseSlug);
  return course ? { title: course.title, description: course.description } : {};
}

export default async function CoursePage({ params }: CoursePageProps) {
  const catalog = await getCatalog();
  const course = catalog.getCourseBySlug((await params).courseSlug);
  if (!course) notFound();

  const area = catalog.areas.find((a) => a.id === course.areaId);
  const modules = catalog.getModulesWithLessons(course.id);
  const lessonIds = catalog.getLessonsOfCourse(course.id).map((l) => l.id);
  const totalMinutes = modules
    .flatMap(({ lessons }) => lessons)
    .reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);
  const prerequisites = course.prerequisites
    .map((id) => catalog.getCourseById(id))
    .filter((c) => c !== undefined);

  return (
    <div className={cn(areaToneClass(course.areaId), "mx-auto max-w-4xl")}>
      <nav aria-label="Ruta de navegación" className="text-muted mb-4 flex items-center gap-1.5 text-sm">
        <Link href="/library" className="hover:text-foreground rounded">
          Biblioteca
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <span className="text-area font-medium">{area?.title}</span>
      </nav>

      <header className="border-border bg-surface relative mb-8 overflow-hidden rounded-2xl border p-6 shadow-xs sm:p-8">
        <div
          aria-hidden
          className="from-area/14 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent"
        />
        <div className="relative">
          <span className="bg-area/14 text-area flex size-11 items-center justify-center rounded-xl">
            <AreaIcon areaId={course.areaId} className="size-5.5" />
          </span>
          <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-muted mt-3 max-w-2xl">{course.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={DIFFICULTY_TONES[course.difficulty]}>{DIFFICULTY_LABELS[course.difficulty]}</Badge>
            <Badge tone="area">
              {modules.length} módulos · {lessonIds.length} lecciones
              {totalMinutes > 0 && ` · ${Math.round(totalMinutes / 60)} h aprox.`}
            </Badge>
            {course.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          {prerequisites.length > 0 && (
            <p className="text-muted mt-4 text-sm">
              Prerrequisitos recomendados:{" "}
              {prerequisites.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ", "}
                  <Link href={`/courses/${p.slug}`} className="text-accent hover:underline">
                    {p.title}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <div className="mt-6 max-w-md">
            <ProgressSummaryBar lessonIds={lessonIds} label="Progreso del curso" tone="area" />
          </div>
        </div>
      </header>

      <ol className="flex flex-col gap-4">
        {modules.map(({ module, lessons }, index) => (
          <li key={module.id} className="border-border bg-surface rounded-xl border p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="bg-area/12 text-area flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2 className="text-foreground text-lg font-semibold">
                  <span className="sr-only">Módulo {index + 1}: </span>
                  {module.title}
                </h2>
                <p className="text-muted mt-1 text-sm">{module.description}</p>
              </div>
            </div>

            {lessons.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1 sm:pl-11">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/courses/${course.slug}/${lesson.slug}`}
                      className="group hover:bg-area/8 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                    >
                      <LessonStatusIcon lessonId={lesson.id} />
                      <span className="text-foreground flex-1 font-medium">{lesson.title}</span>
                      <span className="text-muted flex shrink-0 items-center gap-1 text-xs">
                        <Clock aria-hidden className="size-3" /> {lesson.estimatedMinutes} min
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="text-muted group-hover:text-area size-4 shrink-0 transition-colors"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {module.topics.length > 0 && (
              <details className="mt-4 text-sm sm:pl-11">
                <summary className="text-muted hover:text-foreground cursor-pointer rounded">
                  Temario del módulo ({module.topics.length} temas)
                  {lessons.length === 0 && " · lecciones en preparación"}
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {module.topics.map((topic) => (
                    <li key={topic} className="bg-surface-2 text-muted rounded px-2 py-0.5 text-xs">
                      {topic}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
