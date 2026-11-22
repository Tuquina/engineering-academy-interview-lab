"use client";

import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { summarizeProgress } from "../domain/progress";
import { ProgressIndicator } from "@/shared/ui/progress-indicator";
import { useProgressState } from "./progress-context";

/** Ícono de estado de una lección (pendiente, en curso, completada) con texto accesible. */
export function LessonStatusIcon({ lessonId }: { lessonId: string }) {
  const status = useProgressState().lessons[lessonId]?.status;
  if (status === "completed") {
    return <CheckCircle2 aria-label="Completada" className="text-success size-4 shrink-0" />;
  }
  if (status === "in_progress") {
    return <CircleDot aria-label="En curso" className="text-info size-4 shrink-0" />;
  }
  return <Circle aria-label="Pendiente" className="text-muted/60 size-4 shrink-0" />;
}

/** Progreso agregado sobre un conjunto de lecciones (curso o ruta). */
export function ProgressSummaryBar({
  lessonIds,
  label,
  tone,
}: {
  lessonIds: readonly string[];
  label: string;
  /** Color de la barra (ver `ProgressIndicator`). */
  tone?: "accent" | "area";
}) {
  const summary = summarizeProgress(useProgressState(), lessonIds);
  if (summary.total === 0) {
    return <p className="text-muted text-sm">Todavía no hay lecciones publicadas.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-muted flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums">
          {summary.completed}/{summary.total} lecciones
        </span>
      </div>
      <ProgressIndicator value={summary.ratio} label={label} tone={tone} />
    </div>
  );
}
