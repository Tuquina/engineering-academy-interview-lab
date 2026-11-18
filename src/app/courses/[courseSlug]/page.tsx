import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/infrastructure/composition/learning";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { LessonStatusIcon, ProgressSummaryBar } from "@/modules/progress/presentation/progress-badges";
import { Badge } from "@/shared/ui/badge";

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
  const prerequisites = course.prerequisites
    .map((id) => catalog.getCourseById(id))
    .filter((c) => c !== undefined);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-muted text-sm">{area?.title}</p>
        <h1 className="text-foreground mt-1 text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted mt-3">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="accent">{DIFFICULTY_LABELS[course.difficulty]}</Badge>
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
          <ProgressSummaryBar lessonIds={lessonIds} label="Progreso del curso" />
        </div>
      </header>

      <ol className="flex flex-col gap-4">
        {modules.map(({ module, lessons }, index) => (
          <li key={module.id} className="border-border bg-surface rounded-lg border p-5">
            <h2 className="text-foreground text-lg font-semibold">
              <span className="text-muted mr-2 tabular-nums">{index + 1}.</span>
              {module.title}
            </h2>
            <p className="text-muted mt-1 text-sm">{module.description}</p>

            {lessons.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/courses/${course.slug}/${lesson.slug}`}
                      className="hover:bg-surface-2 flex items-center gap-3 rounded-md px-3 py-2"
                    >
                      <LessonStatusIcon lessonId={lesson.id} />
                      <span className="text-foreground flex-1 font-medium">{lesson.title}</span>
                      <span className="text-muted flex items-center gap-1 text-xs">
                        <Clock aria-hidden className="size-3" /> {lesson.estimatedMinutes} min
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {module.topics.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="text-muted hover:text-foreground cursor-pointer">
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
