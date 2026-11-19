import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/infrastructure/composition/learning";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { CustomCoursesSection } from "@/modules/content-management/presentation/custom-courses-section";
import { ProgressSummaryBar } from "@/modules/progress/presentation/progress-badges";
import { Badge } from "@/shared/ui/badge";

export const metadata: Metadata = { title: "Biblioteca de conocimientos" };

export default async function LibraryPage() {
  const catalog = await getCatalog();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Biblioteca de conocimientos</h1>
        <p className="text-muted mt-2">
          {catalog.courses.length} cursos en {catalog.areas.length} áreas · {catalog.lessonCount} lecciones
          publicadas. Los cursos sin lecciones muestran su temario planificado.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {catalog.areas.map((area) => {
          const courses = catalog.getCoursesByArea(area.id);
          if (courses.length === 0) return null;
          return (
            <section key={area.id} aria-labelledby={`area-${area.slug}`}>
              <h2 id={`area-${area.slug}`} className="text-foreground text-lg font-semibold">
                {area.title}
              </h2>
              <p className="text-muted mb-4 text-sm">{area.description}</p>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => {
                  const lessonIds = catalog.getLessonsOfCourse(course.id).map((l) => l.id);
                  return (
                    <li key={course.id}>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-foreground font-semibold">{course.title}</h3>
                          <Badge tone="accent">{DIFFICULTY_LABELS[course.difficulty]}</Badge>
                        </div>
                        <p className="text-muted line-clamp-3 flex-1 text-sm">{course.description}</p>
                        <p className="text-muted text-xs">
                          {course.modules.length} módulos · {lessonIds.length} lecciones
                        </p>
                        <ProgressSummaryBar lessonIds={lessonIds} label="Progreso" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <CustomCoursesSection />
      </div>
    </div>
  );
}
