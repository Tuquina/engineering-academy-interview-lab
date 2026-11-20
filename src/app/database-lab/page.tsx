import type { Metadata } from "next";
import { getSqlLab } from "@/infrastructure/composition/sql-lab";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { SqlPlayground } from "@/modules/sql-lab/presentation/sql-playground";

export const metadata: Metadata = { title: "Database Lab" };

export default async function DatabaseLabPage() {
  const lab = await getSqlLab();
  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <header className="mb-4">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Database Lab · SQL Playground</h1>
        <p className="text-muted mt-1 text-sm">
          PostgreSQL real en tu navegador con el dataset de un marketplace (catálogo, pedidos, pagos, envíos,
          reseñas y tickets de soporte) y un esquema chico de reservas de hotel. Explorá el esquema, ejecutá
          consultas y resolvé los ejercicios autocorregibles.
        </p>
      </header>
      <SqlPlayground
        dataset={lab.dataset}
        exercises={lab.exercises.map(({ id, title, difficulty, topics }) => ({
          id,
          title,
          difficulty,
          topics,
        }))}
      />
    </div>
  );
}
