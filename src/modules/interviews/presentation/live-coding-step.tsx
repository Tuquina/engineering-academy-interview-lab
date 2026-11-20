"use client";

import { Timer } from "lucide-react";
import { useState } from "react";
import {
  CodeChallengeWorkspace,
  type CodeChallengeWorkspaceProps,
} from "@/modules/challenges/presentation/code-challenge-workspace";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { formatClock, useElapsedSeconds } from "./use-elapsed";

export interface LiveCodingChallenge extends CodeChallengeWorkspaceProps {
  readonly title: string;
  /** `algorithms`: problemas clásicos de estructuras de datos y algoritmos; `practical`: problemas de backend reales. */
  readonly track: "algorithms" | "practical";
}

/**
 * Live coding con reloj: el mismo espacio de trabajo de los challenges (tests reales en un Web Worker) y el
 * resultado de la última ejecución de tests como resultado de la sesión.
 */
export function LiveCodingStep({
  challenge,
  minutes,
  onFinish,
}: {
  challenge: LiveCodingChallenge;
  minutes: number;
  onFinish: (result: { solved: boolean; passed: number; total: number; elapsedSeconds: number }) => void;
}) {
  const [startedAt] = useState(() => Date.now());
  const elapsed = useElapsedSeconds(startedAt);
  const [last, setLast] = useState<{ solved: boolean; passed: number; total: number } | null>(null);
  const remaining = minutes * 60 - elapsed;

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div>
          <h2 className="text-foreground font-semibold">{challenge.title}</h2>
          <p className="text-muted text-xs">
            Pensá en voz alta, escribí tests mentales antes de ejecutar y evitá mirar la solución hasta
            terminar.
          </p>
        </div>
        <p
          className={cn(
            "flex items-center gap-1.5 text-lg font-semibold tabular-nums",
            remaining < 0 ? "text-danger" : "text-foreground",
          )}
          aria-live="off"
        >
          <Timer aria-hidden className="size-5" /> {formatClock(remaining)}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-muted text-sm" role="status">
            {last ? `Última ejecución: ${last.passed}/${last.total} tests` : "Sin ejecuciones todavía"}
          </span>
          <Button
            onClick={() =>
              onFinish({
                solved: last?.solved ?? false,
                passed: last?.passed ?? 0,
                total: last?.total ?? 0,
                elapsedSeconds: elapsed,
              })
            }
          >
            Terminar live coding
          </Button>
        </div>
      </div>
      <CodeChallengeWorkspace {...challenge} onRunComplete={setLast} />
    </div>
  );
}
