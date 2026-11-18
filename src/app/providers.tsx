"use client";

import { useState, type ReactNode } from "react";
import { getClientStores } from "@/infrastructure/composition/client-stores";
import { FlashcardsProvider } from "@/modules/flashcards/presentation/flashcards-context";
import { NotebookProvider } from "@/modules/notebook/presentation/notebook-context";
import {
  PreferencesProvider,
  ReadingFontSizeSync,
} from "@/modules/preferences/presentation/preferences-context";
import { ProgressProvider } from "@/modules/progress/presentation/progress-context";

/** Proveedores de cliente de toda la aplicación. Aquí se inyecta la implementación concreta de cada store. */
export function Providers({ children }: { children: ReactNode }) {
  const [stores] = useState(getClientStores);
  return (
    <PreferencesProvider store={stores.preferences}>
      <ProgressProvider store={stores.progress}>
        <NotebookProvider store={stores.notebook}>
          <FlashcardsProvider store={stores.flashcards}>
            <ReadingFontSizeSync />
            {children}
          </FlashcardsProvider>
        </NotebookProvider>
      </ProgressProvider>
    </PreferencesProvider>
  );
}
