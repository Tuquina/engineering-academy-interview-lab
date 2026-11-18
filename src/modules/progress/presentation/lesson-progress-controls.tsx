"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { useProgressActions, useProgressState } from "./progress-context";

/**
 * Registra la visita a la lección al montarse y permite marcarla como completada o reabrirla.
 * El progreso es local (modo invitado) y así se indica al usuario.
 */
export function LessonProgressControls({ lessonId }: { lessonId: string }) {
  const state = useProgressState();
  const { recordVisit, complete, reopen } = useProgressActions();
  const completed = state.lessons[lessonId]?.status === "completed";

  useEffect(() => {
    recordVisit(lessonId);
  }, [lessonId, recordVisit]);

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-foreground font-medium">
          {completed ? "Lección completada" : "¿Terminaste la lección?"}
        </p>
        <p className="text-muted text-sm">El progreso se guarda en este navegador (modo invitado).</p>
      </div>
      {completed ? (
        <Button variant="secondary" onClick={() => reopen(lessonId)}>
          <RotateCcw /> Marcar como pendiente
        </Button>
      ) : (
        <Button onClick={() => complete(lessonId)}>
          <CheckCircle2 /> Marcar como completada
        </Button>
      )}
    </div>
  );
}
