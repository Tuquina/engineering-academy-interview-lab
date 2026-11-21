import type { Metadata } from "next";
import Link from "next/link";
import { ToolSimulator } from "@/modules/agent-lab/presentation/tool-simulator";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";

export const metadata: Metadata = { title: "Tool Calling Simulator" };

export default function ToolSimulatorPage() {
  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/agents" className="hover:text-foreground">
          AI Agents Lab
        </Link>
      </nav>
      <header className="mb-5">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Tool Calling Simulator</h1>
        <p className="text-muted mt-1 max-w-3xl">
          Invocá las ocho herramientas del agente de atención al cliente como lo haría un modelo. Las
          herramientas son simuladas sobre datos ficticios, pero las validaciones y reglas de negocio son las
          mismas que usa el agente.
        </p>
      </header>
      <ToolSimulator />
    </div>
  );
}
