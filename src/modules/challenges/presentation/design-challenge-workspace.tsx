"use client";

import { ClipboardList } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePracticeActions, usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { ProgressIndicator } from "@/shared/ui/progress-indicator";
import { ResizablePanels } from "@/shared/ui/resizable-panels";
import { rubricScore, type RubricCriterion } from "../domain/challenge";
import { ChallengeBrief, type ChallengeBriefContent } from "./challenge-brief";

const SAVE_DELAY_MS = 600;

/**
 * Challenge de diseño: respuesta escrita y autoevaluación con rúbrica ponderada. No hay corrección automática del
 * texto (no se simula una evaluación semántica que no existe): el puntaje refleja los criterios que el propio usuario
 * marca después de comparar con la solución de referencia.
 */
export function DesignChallengeWorkspace({
  id,
  rubric,
  ...brief
}: ChallengeBriefContent & { id: string; rubric: readonly RubricCriterion[] }) {
  const practice = usePracticeState();
  const { saveDesignAnswer, markSolutionRevealed } = usePracticeActions();
  const saved = practice.design[id];
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const answer = draft ?? saved?.answer ?? "";
  const checked = saved?.checkedCriteria ?? [];
  const score = rubricScore(rubric, checked);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Se guarda sólo lo que cambió: el store combina con el valor vigente (sin cierres obsoletos).
  const persist = (patch: { answer?: string; checkedCriteria?: readonly string[] }) =>
    saveDesignAnswer(id, patch);

  return (
    <ResizablePanels
      initialLeftPercent={45}
      className="min-h-[40rem]"
      left={
        <ChallengeBrief
          {...brief}
          solution={brief.solutionExplanation}
          solved={checked.length > 0}
          onRevealSolution={() => markSolutionRevealed(id)}
        />
      }
      right={
        <div className="flex flex-col gap-4">
          <section className="border-border bg-surface rounded-lg border p-4">
            <label htmlFor={`${id}-answer`} className="text-foreground mb-1 block text-sm font-semibold">
              Tu diseño
            </label>
            <p className="text-muted mb-2 text-xs">
              Escribilo como lo explicarías en la entrevista: requerimientos, componentes, modelo de datos,
              flujos, fallas y compromisos. Se guarda automáticamente en este navegador.
            </p>
            <textarea
              id={`${id}-answer`}
              value={answer}
              onChange={(event) => {
                const value = event.target.value;
                setDraft(value);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => {
                  persist({ answer: value });
                  setDraft(null);
                }, SAVE_DELAY_MS);
              }}
              rows={16}
              className="border-border bg-background text-foreground w-full resize-y rounded-md border p-3 font-mono text-sm leading-relaxed"
              placeholder={
                "1. Requerimientos y supuestos\n2. Componentes\n3. Modelo de datos\n4. Flujos\n5. Fallas y escalabilidad\n6. Compromisos"
              }
            />
          </section>

          <section className="border-border bg-surface rounded-lg border p-4">
            <h2 className="text-foreground mb-1 flex items-center gap-2 text-sm font-semibold">
              <ClipboardList aria-hidden className="text-accent size-4" /> Autoevaluación con rúbrica
            </h2>
            <p className="text-muted mb-3 text-xs">
              Marcá sólo lo que tu respuesta cubre de forma explícita. Compará con la solución de referencia
              antes de evaluarte: el puntaje es tuyo, no una corrección automática.
            </p>
            <ul className="flex flex-col gap-2">
              {rubric.map((criterion) => (
                <li key={criterion.id}>
                  <label className="hover:bg-surface-2 flex cursor-pointer gap-3 rounded-md p-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked.includes(criterion.id)}
                      onChange={(event) =>
                        persist({
                          checkedCriteria: event.target.checked
                            ? [...checked, criterion.id]
                            : checked.filter((c) => c !== criterion.id),
                        })
                      }
                    />
                    <span>
                      <span className="text-foreground font-medium">{criterion.criterion}</span>
                      <span className="text-muted ml-1 text-xs">({criterion.weight} pts)</span>
                      <span className="text-muted block text-xs">{criterion.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Cobertura de la rúbrica</span>
                <span className="text-foreground font-medium tabular-nums">{Math.round(score * 100)}%</span>
              </div>
              <ProgressIndicator value={score} label="Cobertura de la rúbrica" />
            </div>
          </section>
        </div>
      }
    />
  );
}
