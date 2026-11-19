"use client";

import { useState, type ReactNode } from "react";
import { getClientStores } from "@/infrastructure/composition/client-stores";
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

const createSqlEngine = (dataset: string) => new WorkerSqlEngine(dataset);

/** Proveedores de cliente de toda la aplicación. Aquí se inyecta la implementación concreta de cada store. */
export function Providers({ children }: { children: ReactNode }) {
  const [stores] = useState(getClientStores);
  const [runner] = useState(() => new WorkerCodeRunner());
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
                      <ReadingFontSizeSync />
                      {children}
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
