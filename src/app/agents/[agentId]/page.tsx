import type { Metadata } from "next";
import Link from "next/link";
import { AgentWorkspace } from "@/modules/agent-lab/presentation/agent-workspace";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";

export const metadata: Metadata = { title: "Agente · AI Agents Lab" };

interface AgentPageProps {
  params: Promise<{ agentId: string }>;
}

/** Los agentes viven en el navegador (modo invitado): la página sólo pasa el id al espacio de trabajo. */
export default async function AgentPage({ params }: AgentPageProps) {
  const { agentId } = await params;
  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/agents" className="hover:text-foreground">
          AI Agents Lab
        </Link>
      </nav>
      <AgentWorkspace agentId={decodeURIComponent(agentId)} />
    </div>
  );
}
