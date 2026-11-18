"use client";

import { BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsClient } from "@/shared/lib/use-is-client";
import { useProgressActions, useProgressState } from "./progress-context";

export interface ReadingSection {
  readonly id: string;
  readonly title: string;
}

/**
 * Registra la última sección leída: la del encabezado más bajo que ya pasó por la parte superior de la pantalla.
 * Usa `IntersectionObserver` (sin listeners de scroll) y sólo escribe cuando la sección cambia.
 */
export function ReadingPositionTracker({
  lessonId,
  sections,
}: {
  lessonId: string;
  sections: readonly ReadingSection[];
}) {
  const { recordPosition } = useProgressActions();

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      () => {
        const passed = headings.filter((h) => h.getBoundingClientRect().top < window.innerHeight * 0.3);
        const current = passed.at(-1);
        if (current) recordPosition(lessonId, current.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [lessonId, sections, recordPosition]);

  return null;
}

/**
 * Ofrece retomar la lectura en la última sección registrada. Se decide una sola vez al cargar: no aparece mientras
 * el usuario avanza en la lección actual ni si la URL ya apunta a una sección.
 */
export function ResumeReadingBanner({
  lessonId,
  sections,
}: {
  lessonId: string;
  sections: readonly ReadingSection[];
}) {
  const lastSectionId = useProgressState().lessons[lessonId]?.lastSectionId ?? null;
  const isClient = useIsClient();
  // `undefined` = todavía sin decidir. Se congela la primera lectura en el cliente (patrón de estado derivado
  // durante el render): los avances posteriores en esta misma visita no deben hacer aparecer el aviso.
  const [target, setTarget] = useState<ReadingSection | null | undefined>(undefined);

  if (target === undefined && isClient) {
    const index = sections.findIndex((s) => s.id === lastSectionId);
    // La primera sección no aporta: la lección ya empieza ahí.
    setTarget(index > 0 && !window.location.hash ? (sections[index] ?? null) : null);
  }

  if (!target) return null;
  return (
    <div className="border-accent/40 bg-accent/8 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
      <span className="text-foreground flex items-center gap-2">
        <BookmarkCheck aria-hidden className="text-accent size-4" />
        Te quedaste en <strong className="font-semibold">{target.title}</strong>
      </span>
      <span className="flex gap-3">
        <a
          href={`#${target.id}`}
          onClick={() => setTarget(null)}
          className="text-accent font-medium hover:underline"
        >
          Retomar lectura
        </a>
        <button type="button" onClick={() => setTarget(null)} className="text-muted hover:text-foreground">
          Descartar
        </button>
      </span>
    </div>
  );
}
