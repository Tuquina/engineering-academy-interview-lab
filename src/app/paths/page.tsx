import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/infrastructure/composition/learning";
import { ProgressSummaryBar } from "@/modules/progress/presentation/progress-badges";

export const metadata: Metadata = { title: "Rutas de aprendizaje" };

export default async function PathsPage() {
  const catalog = await getCatalog();

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Rutas de aprendizaje</h1>
        <p className="text-muted mt-2">
          Secuencias curadas de cursos y lecciones. Al publicarse nuevas lecciones en un curso de la ruta, se
          incorporan automáticamente.
        </p>
      </header>
      <ul className="flex flex-col gap-4">
        {catalog.paths.map((path) => {
          const lessonIds = catalog.resolvePathLessons(path).map((l) => l.id);
          return (
            <li key={path.id}>
              <Link
                href={`/paths/${path.slug}`}
                className="border-border bg-surface hover:border-accent/50 flex flex-col gap-3 rounded-lg border p-5"
              >
                <h2 className="text-foreground text-lg font-semibold">{path.title}</h2>
                <p className="text-muted text-sm">{path.description}</p>
                <p className="text-muted text-xs">
                  {path.stages.length} etapas · {lessonIds.length} lecciones publicadas
                </p>
                <ProgressSummaryBar lessonIds={lessonIds} label="Progreso de la ruta" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
