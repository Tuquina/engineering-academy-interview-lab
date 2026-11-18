"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { ProgressStore } from "../application/progress-store";
import {
  EMPTY_PROGRESS,
  completeLesson,
  recordLessonVisit,
  reopenLesson,
  type ProgressState,
} from "../domain/progress";

const ProgressStoreContext = createContext<ProgressStore | null>(null);

/** Provee el store de progreso a la UI. La implementación concreta se decide en la raíz de composición. */
export function ProgressProvider({ store, children }: { store: ProgressStore; children: ReactNode }) {
  return <ProgressStoreContext.Provider value={store}>{children}</ProgressStoreContext.Provider>;
}

function useStore(): ProgressStore {
  const store = useContext(ProgressStoreContext);
  if (!store) throw new Error("useProgress debe usarse dentro de <ProgressProvider>.");
  return store;
}

const getServerSnapshot = (): ProgressState => EMPTY_PROGRESS;

/**
 * Estado de progreso reactivo. Durante SSR e hidratación devuelve el estado vacío para evitar diferencias
 * entre servidor y cliente; después refleja lo persistido.
 */
export function useProgressState(): ProgressState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}

export interface ProgressActions {
  recordVisit(lessonId: string): void;
  complete(lessonId: string): void;
  reopen(lessonId: string): void;
}

/** Acciones de progreso; encapsulan el reloj y la persistencia para que los componentes no los conozcan. */
export function useProgressActions(): ProgressActions {
  const store = useStore();
  return useMemo(
    () => ({
      recordVisit: (lessonId) => store.update((s) => recordLessonVisit(s, lessonId, new Date())),
      complete: (lessonId) => store.update((s) => completeLesson(s, lessonId, new Date())),
      reopen: (lessonId) => store.update((s) => reopenLesson(s, lessonId)),
    }),
    [store],
  );
}
