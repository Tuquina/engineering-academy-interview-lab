import { BookOpen, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_PATH_ID } from "@/infrastructure/composition/learner-data";
import { getCatalog } from "@/infrastructure/composition/learning";
import { ActivePathButton } from "@/modules/preferences/presentation/active-path-button";
import { LessonStatusIcon, ProgressSummaryBar } from "@/modules/progress/presentation/progress-badges";

interface PathPageProps {
  params: Promise<{ pathSlug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getCatalog()).paths.map((path) => ({ pathSlug: path.slug }));
}

export async function generateMetadata({ params }: PathPageProps): Promise<Metadata> {
  const path = (await getCatalog()).getPathBySlug((await params).pathSlug);
  return path ? { title: path.title, description: path.description } : {};
}

export default async function PathPage({ params }: PathPageProps) {
  const catalog = await getCatalog();
  const path = catalog.getPathBySlug((await params).pathSlug);
  if (!path) notFound();

  const lessonIds = catalog.resolvePathLessons(path).map((l) => l.id);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-muted text-sm">Ruta de aprendizaje</p>
        <h1 className="text-foreground mt-1 text-3xl font-bold tracking-tight">{path.title}</h1>
        <p className="text-muted mt-3">{path.description}</p>
        <p className="text-muted mt-2 text-sm">
          <span className="text-foreground font-medium">Para quién:</span> {path.audience}
        </p>
        <div className="mt-6 max-w-md">
          <ProgressSummaryBar lessonIds={lessonIds} label="Progreso de la ruta" />
          <div className="mt-3">
            <ActivePathButton pathId={path.id} isDefault={path.id === DEFAULT_PATH_ID} />
          </div>
        </div>
      </header>

      <ol className="border-border relative flex flex-col gap-6 border-l pl-6">
        {path.stages.map((stage, index) => (
          <li key={stage.id} className="relative">
            <span className="border-border bg-surface text-muted absolute top-0.5 -left-[2.05rem] flex size-6 items-center justify-center rounded-full border text-xs font-semibold">
              {index + 1}
            </span>
            <h2 className="text-foreground text-lg font-semibold">{stage.title}</h2>
            <p className="text-muted mt-1 text-sm">{stage.description}</p>
            {stage.goals.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {stage.goals.map((goal) => (
                  <li key={goal} className="text-foreground/90 flex gap-2">
                    <Target aria-hidden className="text-accent mt-0.5 size-3.5 shrink-0" />
                    {goal}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-3 flex flex-col gap-1">
              {stage.items.map((item) => {
                if (item.kind === "lesson") {
                  const lesson = catalog.getLessonById(item.lessonId);
                  const course = lesson && catalog.getCourseById(lesson.courseId);
                  if (!lesson || !course) return null;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/courses/${course.slug}/${lesson.slug}`}
                        className="border-border bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-md border px-3 py-2"
                      >
                        <LessonStatusIcon lessonId={lesson.id} />
                        <span className="text-foreground flex-1 text-sm font-medium">{lesson.title}</span>
                        <span className="text-muted text-xs">{lesson.estimatedMinutes} min</span>
                      </Link>
                    </li>
                  );
                }
                const course = catalog.getCourseById(item.courseId);
                if (!course) return null;
                const count = catalog.getLessonsOfCourse(course.id).length;
                return (
                  <li key={course.id}>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="border-border bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-md border px-3 py-2"
                    >
                      <BookOpen aria-hidden className="text-violet size-4" />
                      <span className="text-foreground flex-1 text-sm font-medium">
                        Curso: {course.title}
                      </span>
                      <span className="text-muted text-xs">
                        {count > 0
                          ? `${count} ${count === 1 ? "lección" : "lecciones"}`
                          : "lecciones en preparación"}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {stage.items.length === 0 && <li className="text-muted text-sm">Contenido en preparación.</li>}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
