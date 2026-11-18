import { getLearnerData } from "@/infrastructure/composition/learner-data";
import { DashboardOverview } from "@/modules/progress/presentation/dashboard-overview";

export default async function DashboardPage() {
  const data = await getLearnerData();
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
