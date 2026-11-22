import { Layers3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/infrastructure/composition/learning";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { CustomCoursesSection } from "@/modules/content-management/presentation/custom-courses-section";
import { ProgressSummaryBar } from "@/modules/progress/presentation/progress-badges";
import { cn } from "@/shared/lib/cn";
import { AreaIcon } from "@/shared/ui/area-icon";
import { areaToneClass } from "@/shared/ui/area-tone";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";
import { interactiveCardClass } from "@/shared/ui/card";

export const metadata: Metadata = { title: "Biblioteca de conocimientos" };

export default async function LibraryPage() {
  const catalog = await getCatalog();
  const areas = catalog.areas.filter((area) => catalog.getCoursesByArea(area.id).length > 0);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Biblioteca de conocimientos</h1>
        <p className="text-muted mt-2">
          {catalog.courses.length} cursos en {catalog.areas.length} áreas · {catalog.lessonCount} lecciones
          publicadas. Los cursos sin lecciones muestran su temario planificado.
        </p>
      </header>

      <nav aria-label="Áreas de la biblioteca" className="mb-10 flex flex-wrap gap-2">
        {areas.map((area) => {
          return (
            <a
              key={area.id}
              href={`#area-${area.slug}`}
              className={cn(
                areaToneClass(area.id),
                "border-border bg-surface hover:border-area/50 hover:bg-area/8 text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              )}
            >
              <AreaIcon areaId={area.id} className="text-area size-4" />
              {area.title}
            </a>
          );
        })}
      </nav>

      <div className="flex flex-col gap-12">
        {areas.map((area) => {
          const courses = catalog.getCoursesByArea(area.id);
          return (
            <section
              key={area.id}
              aria-labelledby={`area-${area.slug}`}
              className={cn(areaToneClass(area.id), "scroll-mt-20")}
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="bg-area/12 text-area flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <AreaIcon areaId={area.id} className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2
                    id={`area-${area.slug}`}
                    className="text-foreground scroll-mt-20 text-xl font-semibold tracking-tight"
                  >
                    {area.title}
                  </h2>
                  <p className="text-muted text-sm">{area.description}</p>
                </div>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => {
                  const lessonIds = catalog.getLessonsOfCourse(course.id).map((l) => l.id);
                  return (
                    <li key={course.id}>
                      <Link
                        href={`/courses/${course.slug}`}
                        className={cn(interactiveCardClass, "flex h-full flex-col overflow-hidden")}
                      >
                        <span aria-hidden className="bg-area h-1 w-full" />
                        <div className="flex flex-1 flex-col gap-3 p-5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-foreground font-semibold">{course.title}</h3>
                            <Badge tone={DIFFICULTY_TONES[course.difficulty]}>
                              {DIFFICULTY_LABELS[course.difficulty]}
                            </Badge>
                          </div>
                          <p className="text-muted line-clamp-3 flex-1 text-sm">{course.description}</p>
                          <p className="text-muted flex items-center gap-1.5 text-xs">
                            <Layers3 aria-hidden className="text-area size-3.5" />
                            {course.modules.length} módulos · {lessonIds.length} lecciones
                          </p>
                          <ProgressSummaryBar lessonIds={lessonIds} label="Progreso" tone="area" />
                        </div>
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
