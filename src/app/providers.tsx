"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getClientStores } from "@/infrastructure/composition/client-stores";
import { createAgentRuntime } from "@/infrastructure/composition/agent-runtime";
import { AgentLabProvider, AgentRuntimeProvider } from "@/modules/agent-lab/presentation/agent-lab-context";
import { WorkerCodeRunner } from "@/modules/exercises/infrastructure/worker-code-runner";
import { CodeRunnerProvider } from "@/modules/exercises/presentation/code-runner-context";
import { WorkerSqlEngine } from "@/modules/sql-lab/infrastructure/worker-sql-engine";
import { SqlEngineProvider } from "@/modules/sql-lab/presentation/sql-engine-context";
import { StudioProvider } from "@/modules/system-design/presentation/studio-context";
import { InterviewsProvider } from "@/modules/interviews/presentation/interviews-context";
import { PracticeProvider } from "@/modules/exercises/presentation/practice-context";
import { FlashcardsProvider } from "@/modules/flashcards/presentation/flashcards-context";
import { NotebookProvider } from "@/modules/notebook/presentation/notebook-context";
import {
  PreferencesProvider,
  ReadingFontSizeSync,
} from "@/modules/preferences/presentation/preferences-context";
import { ProgressProvider } from "@/modules/progress/presentation/progress-context";
import { AI_DISABLED, AiStatusProvider, type AiStatus } from "@/shared/lib/ai-status";

const createSqlEngine = (dataset: string) => new WorkerSqlEngine(dataset);

/**
 * Proveedores de cliente de toda la aplicación. Aquí se inyecta la implementación concreta de cada store.
 *
 * El estado del proveedor LLM real se consulta al servidor en tiempo de ejecución (no se fija en el build): sólo
 * informa si hay credenciales y qué modelo se usa, nunca las credenciales.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [stores] = useState(getClientStores);
  const [runner] = useState(() => new WorkerCodeRunner());
  const [ai, setAi] = useState<AiStatus>(AI_DISABLED);
  useEffect(() => {
    let active = true;
    fetch("/api/ai/status")
      .then((r) => (r.ok ? (r.json() as Promise<AiStatus>) : AI_DISABLED))
      .then((status) => {
        if (active) setAi(status);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const agentRuntime = useMemo(() => createAgentRuntime(ai), [ai]);
  return (
    <PreferencesProvider store={stores.preferences}>
      <ProgressProvider store={stores.progress}>
        <NotebookProvider store={stores.notebook}>
          <FlashcardsProvider store={stores.flashcards}>
            <PracticeProvider store={stores.practice}>
              <CodeRunnerProvider runner={runner}>
                <SqlEngineProvider factory={createSqlEngine}>
                  <StudioProvider store={stores.studio}>
                    <InterviewsProvider store={stores.interviews}>
                      <AgentLabProvider store={stores.agentLab}>
                        <AgentRuntimeProvider runtime={agentRuntime}>
                          <AiStatusProvider status={ai}>
                            <ReadingFontSizeSync />
                            {children}
                          </AiStatusProvider>
                        </AgentRuntimeProvider>
                      </AgentLabProvider>
                    </InterviewsProvider>
                  </StudioProvider>
                </SqlEngineProvider>
              </CodeRunnerProvider>
            </PracticeProvider>
          </FlashcardsProvider>
        </NotebookProvider>
      </ProgressProvider>
    </PreferencesProvider>
  );
}
