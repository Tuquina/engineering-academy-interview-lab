import { getCatalog } from "@/infrastructure/composition/learning";
import type { DashboardData, DashboardLesson } from "@/modules/progress/presentation/dashboard-overview";
import { DashboardOverview } from "@/modules/progress/presentation/dashboard-overview";

/** Ruta activa por defecto hasta que exista la preferencia de usuario (Fase 2). */
const DEFAULT_PATH_SLUG = "full-stack-ai-platform-engineer";

export default async function DashboardPage() {
  const catalog = await getCatalog();
  const path = catalog.getPathBySlug(DEFAULT_PATH_SLUG) ?? catalog.paths[0];

  const lessons: Record<string, DashboardLesson> = {};
  for (const course of catalog.courses) {
    for (const lesson of catalog.getLessonsOfCourse(course.id)) {
      lessons[lesson.id] = {
        id: lesson.id,
        title: lesson.title,
        href: `/courses/${course.slug}/${lesson.slug}`,
        courseTitle: course.title,
        estimatedMinutes: lesson.estimatedMinutes,
      };
    }
  }

  const data: DashboardData = {
    activePath: path
      ? {
          title: path.title,
          href: `/paths/${path.slug}`,
          lessonIds: catalog.resolvePathLessons(path).map((l) => l.id),
        }
      : null,
    courses: catalog.courses.map((course) => ({
      id: course.id,
      title: course.title,
      href: `/courses/${course.slug}`,
      lessonIds: catalog.getLessonsOfCourse(course.id).map((l) => l.id),
    })),
    lessons,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted mt-1">Qué estudiar ahora y cuánto avanzaste en tu preparación.</p>
      </header>
      <DashboardOverview data={data} />
    </div>
  );
}
