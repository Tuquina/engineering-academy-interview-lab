import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/composition/auth";
import { getPublicContent } from "@/infrastructure/composition/content";
import { customLessonId } from "@/modules/content-management/domain/custom-content";
import { FlashcardList } from "@/modules/content-management/presentation/flashcard-list";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { LessonStatusIcon } from "@/modules/progress/presentation/progress-badges";
import { Badge } from "@/shared/ui/badge";

interface PageProps {
  params: Promise<{ courseSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/** Curso personalizado (contenido de la base). Los administradores pueden previsualizar borradores con `?preview=1`. */
async function loadCourse({ params, searchParams }: PageProps) {
  const [{ courseSlug }, { preview }] = await Promise.all([params, searchParams]);
  const content = getPublicContent();
  if (!content) return null;
  const isAdmin = preview === "1" && (await getCurrentUser())?.role === "admin";
  const course = await content.getPublishedCourse(courseSlug, { preview: isAdmin });
  return course ? { course, preview: isAdmin } : null;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const loaded = await loadCourse(props);
  return loaded ? { title: loaded.course.title, description: loaded.course.description } : {};
}

export default async function CustomCoursePage(props: PageProps) {
  const loaded = await loadCourse(props);
  if (!loaded) notFound();
  const { course, preview } = loaded;
  const query = preview ? "?preview=1" : "";
  return (
    <div className="mx-auto max-w-4xl">
      <nav aria-label="Ruta de navegación" className="text-muted mb-4 text-sm">
        <Link href="/library" className="hover:text-foreground">
          Biblioteca
        </Link>
      </nav>
      {preview ? (
        <p className="border-warning/40 bg-warning/10 text-foreground mb-4 rounded-md border px-3 py-2 text-sm">
          Vista previa de administrador: incluye borradores.
        </p>
      ) : null}
      <header className="mb-8">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted mt-2">{course.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="violet">Contenido personalizado</Badge>
          <Badge tone="accent">{DIFFICULTY_LABELS[course.difficulty]}</Badge>
          <Badge>{course.lessons.length} lección(es)</Badge>
        </div>
      </header>
      {course.modules.map((section) => {
        const lessons = course.lessons.filter((l) => l.moduleId === section.id);
        if (lessons.length === 0) return null;
        return (
          <section key={section.id} className="mb-8" aria-labelledby={`modulo-${section.id}`}>
            <h2
              id={`modulo-${section.id}`}
              className="text-foreground mb-3 text-xl font-semibold tracking-tight"
            >
              {section.title}
            </h2>
            <ol className="space-y-2">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/c/${course.slug}/${lesson.slug}${query}`}
                    className="border-border bg-surface hover:border-accent/50 flex items-center gap-3 rounded-lg border p-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block font-medium">{lesson.title}</span>
                      <span className="text-muted text-sm">{lesson.description}</span>
                    </span>
                    {lesson.status === "draft" ? <Badge tone="warning">Borrador</Badge> : null}
                    <Badge>
                      <Clock aria-hidden className="size-3" /> {lesson.estimatedMinutes} min
                    </Badge>
                    <LessonStatusIcon lessonId={customLessonId(lesson.id)} />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      {course.flashcards.length ? <FlashcardList cards={course.flashcards} /> : null}
    </div>
  );
}
