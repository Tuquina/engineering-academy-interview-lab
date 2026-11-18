import type { Metadata } from "next";
import { getLearnerData } from "@/infrastructure/composition/learner-data";
import { StatsOverview } from "@/modules/progress/presentation/stats-overview";

export const metadata: Metadata = { title: "Estadísticas y progreso" };

export default async function StatsPage() {
  const data = await getLearnerData();
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Estadísticas y progreso</h1>
        <p className="text-muted mt-1">Calculadas con la actividad registrada en este navegador.</p>
      </header>
      <StatsOverview data={data} />
    </div>
  );
}
