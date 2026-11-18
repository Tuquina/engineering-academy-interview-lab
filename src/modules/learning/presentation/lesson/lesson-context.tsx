"use client";

import { createContext, useContext, type ReactNode } from "react";

const LessonContext = createContext<{ lessonId: string } | null>(null);

/** Expone la lección actual a los componentes MDX interactivos (por ejemplo, para registrar respuestas). */
export function LessonContextProvider({ lessonId, children }: { lessonId: string; children: ReactNode }) {
  return <LessonContext.Provider value={{ lessonId }}>{children}</LessonContext.Provider>;
}

/** Lección actual, o `null` si el componente se usa fuera de una lección (p. ej. en una cheatsheet). */
export function useCurrentLesson(): { lessonId: string } | null {
  return useContext(LessonContext);
}
