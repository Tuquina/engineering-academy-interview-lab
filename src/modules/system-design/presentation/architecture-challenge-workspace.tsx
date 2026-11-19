"use client";

import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Eye,
  HelpCircle,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { rubricScore } from "@/modules/challenges/domain/challenge";
import { useIsClient } from "@/shared/lib/use-is-client";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { ProgressIndicator } from "@/shared/ui/progress-indicator";
import {
  SYSTEM_DESIGN_PHASES,
  completedPhases,
  phaseBudgets,
  type ArchitectureChallenge,
  type SystemDesignPhaseId,
} from "../domain/architecture-challenge";
import { createDocument } from "../domain/canvas";
import { SIMULATIONS } from "../domain/simulations/catalog";
import { challengeDocumentId } from "../domain/studio";
import { CanvasEditor } from "./canvas-editor";
import { useStudioActions, useStudioState } from "./studio-context";

const SAVE_DELAY_MS = 500;

export type ArchitectureChallengeData = Omit<ArchitectureChallenge, "context" | "solution">;

export interface InterviewResult {
  readonly phasesWithNotes: number;
  readonly checklist: readonly string[];
  readonly rubric: readonly string[];
  readonly score: number;
  readonly elapsedSeconds: number;
}

interface WorkspaceProps {
  readonly challenge: ArchitectureChallengeData;
  readonly context: ReactNode;
  readonly solution: ReactNode;
  /** Clave bajo la que se guarda el trabajo; por defecto, el ID del challenge. */
  readonly workKey?: string;
  /** Modo entrevista: reloj por fase y la solución se muestra sólo al terminar. */
  readonly interview?: {
    readonly totalMinutes: number;
    readonly onFinish: (result: InterviewResult) => void;
  };
}

function formatClock(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalSeconds));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * Espacio de trabajo de un challenge de arquitectura: escenario, requerimientos, preguntas aclaratorias, las ocho
 * fases de diseño (con el canvas en la fase de componentes), checklist, autoevaluación con rúbrica y diseño de
 * referencia. La rúbrica es una autoevaluación: no hay corrección automática del texto.
 */
export function ArchitectureChallengeWorkspace({
  challenge,
  context,
  solution,
  workKey,
  interview,
}: WorkspaceProps) {
  const isClient = useIsClient();
  const key = workKey ?? challenge.id;
  const state = useStudioState();
  const { saveChallengeWork, saveDocument } = useStudioActions();
  const work = state.challengeWork[key];
  const [phase, setPhase] = useState<SystemDesignPhaseId>("requirements");
  const [drafts, setDrafts] = useState<Partial<Record<SystemDesignPhaseId, string>>>({});
  const [showSolution, setShowSolution] = useState(false);
  const [finished, setFinished] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const [startedAt] = useState(() => Date.now());
  const [phaseStartedAt, setPhaseStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!interview || finished) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [interview, finished]);

  const notes = { ...work?.notes, ...drafts } as Record<string, string>;
  const checklist = work?.checklist ?? [];
  const rubric = work?.rubric ?? [];
  const score = rubricScore(challenge.rubric, rubric);
  const done = completedPhases(notes);
  const budgets = interview ? phaseBudgets(interview.totalMinutes) : null;
  const current = SYSTEM_DESIGN_PHASES.find((p) => p.id === phase)!;
  const docId = challengeDocumentId(key);
  const emptyDoc = useMemo(
    () => createDocument(docId, `Diseño: ${challenge.title}`, new Date(0)),
    [docId, challenge.title],
  );
  const canvasDoc = state.documents[docId] ?? emptyDoc;
  const solutionVisible = interview ? finished : showSolution;

  const writeNote = (phaseId: SystemDesignPhaseId, value: string) => {
    setDrafts((d) => ({ ...d, [phaseId]: value }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveChallengeWork(key, { notes: { [phaseId]: value } });
      setDrafts((d) => {
        const { [phaseId]: _saved, ...rest } = d;
        return rest;
      });
    }, SAVE_DELAY_MS);
  };

  const goTo = (phaseId: SystemDesignPhaseId) => {
    setPhase(phaseId);
    setPhaseStartedAt(now);
  };

  const [elapsedAtFinish, setElapsedAtFinish] = useState(0);
  const finish = () => {
    setFinished(true);
    setElapsedAtFinish(Math.round((Date.now() - startedAt) / 1000));
  };
  const submitEvaluation = () =>
    interview?.onFinish({
      phasesWithNotes: done.length,
      checklist,
      rubric,
      score,
      elapsedSeconds: elapsedAtFinish,
    });

  const phaseIndex = SYSTEM_DESIGN_PHASES.findIndex((p) => p.id === phase);
  const elapsedTotal = (now - startedAt) / 1000;
  const elapsedPhase = (now - phaseStartedAt) / 1000;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="escenario" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="escenario" className="text-foreground mb-3 text-lg font-semibold">
          Escenario
        </h2>
        <div className="prose prose-sm reading-scale max-w-none">{context}</div>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {[
            { title: "Requerimientos funcionales", items: challenge.functionalRequirements },
            { title: "Requerimientos no funcionales", items: challenge.nonFunctionalRequirements },
            { title: "Datos de escala", items: challenge.scale },
          ].map((block) => (
            <div key={block.title}>
              <h3 className="text-foreground mb-1 text-sm font-semibold">{block.title}</h3>
              <ul className="text-muted list-disc space-y-1 pl-5 text-sm">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <h3 className="text-foreground mt-5 mb-2 flex items-center gap-2 text-sm font-semibold">
          <HelpCircle aria-hidden className="text-accent size-4" /> Preguntas aclaratorias
        </h3>
        <p className="text-muted mb-2 text-xs">
          Pensá qué preguntarías antes de diseñar. Abrí cada una para ver por qué importa la respuesta.
        </p>
        <ul className="flex flex-col gap-2">
          {challenge.clarifyingQuestions.map((q) => (
            <li key={q.question}>
              <details className="border-border bg-background rounded-md border">
                <summary className="text-foreground cursor-pointer px-3 py-2 text-sm">{q.question}</summary>
                <p className="text-muted border-border border-t px-3 py-2 text-sm">{q.why}</p>
              </details>
            </li>
          ))}
        </ul>
        {(challenge.relatedSimulations.length > 0 || challenge.relatedPatterns.length > 0) && (
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {challenge.relatedPatterns.map((slug) => (
              <Link key={slug} href={`/patterns/${slug}`} className="text-accent hover:underline">
                Patrón: {slug}
              </Link>
            ))}
            {challenge.relatedSimulations.map((slug) => (
              <Link
                key={slug}
                href={`/system-design/simulators/${slug}`}
                className="text-accent hover:underline"
              >
                Simulador: {SIMULATIONS.find((s) => s.slug === slug)?.title ?? slug}
              </Link>
            ))}
          </p>
        )}
      </section>

      <section aria-labelledby="espacio" className="border-border bg-surface rounded-lg border p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="espacio" className="text-foreground text-lg font-semibold">
            Espacio de diseño
          </h2>
          {interview && budgets && !finished && (
            <p className="text-muted flex items-center gap-2 text-sm tabular-nums" aria-live="off">
              <Timer aria-hidden className="text-accent size-4" />
              Fase: {formatClock(budgets[phase] * 60 - elapsedPhase)} · Total:{" "}
              {formatClock(interview.totalMinutes * 60 - elapsedTotal)}
            </p>
          )}
          {!interview && <p className="text-muted text-xs">Se guarda automáticamente en este navegador.</p>}
        </div>

        <ol className="mb-4 flex flex-wrap gap-1.5" aria-label="Fases">
          {SYSTEM_DESIGN_PHASES.map((p, index) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => goTo(p.id)}
                aria-current={phase === p.id ? "step" : undefined}
                className={cn(
                  "border-border flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                  phase === p.id
                    ? "bg-accent text-accent-foreground border-accent"
                    : "text-foreground hover:bg-surface-2",
                )}
              >
                {isClient && done.includes(p.id) ? (
                  <CheckCircle2 aria-label="con notas" className="size-3.5" />
                ) : (
                  <span className="tabular-nums">{index + 1}.</span>
                )}
                {p.title}
                {budgets && <span className="opacity-70">({budgets[p.id]} min)</span>}
              </button>
            </li>
          ))}
        </ol>

        <p className="text-muted mb-2 text-sm">{current.prompt}</p>
        {phase === "components" && (
          <div className="mb-3">
            {isClient ? (
              <CanvasEditor
                key={docId}
                document={canvasDoc}
                onChange={(doc) => saveDocument({ ...doc, id: docId })}
                heightClass="h-[30rem]"
              />
            ) : (
              <div className="border-border h-[30rem] animate-pulse rounded-lg border" aria-hidden />
            )}
          </div>
        )}
        <label className="sr-only" htmlFor={`${key}-${phase}`}>
          Notas de la fase {current.title}
        </label>
        <textarea
          id={`${key}-${phase}`}
          value={isClient ? (notes[phase] ?? "") : ""}
          onChange={(e) => writeNote(phase, e.target.value)}
          rows={phase === "components" ? 4 : 10}
          placeholder={
            phase === "components" ? "Responsabilidad de cada componente y por qué está." : "Tus notas…"
          }
          className="border-border bg-background text-foreground w-full resize-y rounded-md border p-3 text-sm leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <span className="text-muted text-xs">
            {done.length} de {SYSTEM_DESIGN_PHASES.length} fases con notas
          </span>
          <div className="flex gap-2">
            {interview && !finished && (
              <Button
                size="sm"
                variant={phaseIndex === SYSTEM_DESIGN_PHASES.length - 1 ? "primary" : "ghost"}
                onClick={finish}
              >
                Terminar y evaluar
              </Button>
            )}
            {phaseIndex < SYSTEM_DESIGN_PHASES.length - 1 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => goTo(SYSTEM_DESIGN_PHASES[phaseIndex + 1]!.id)}
              >
                Siguiente fase <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </section>

      {(!interview || finished) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="checklist" className="border-border bg-surface rounded-lg border p-5">
            <h2
              id="checklist"
              className="text-foreground mb-1 flex items-center gap-2 text-base font-semibold"
            >
              <ClipboardCheck aria-hidden className="text-accent size-4" /> Checklist
            </h2>
            <p className="text-muted mb-3 text-xs">
              Lo que un diseño completo para este problema debería mencionar.
            </p>
            <ul className="flex flex-col gap-1">
              {challenge.checklist.map((item) => (
                <li key={item}>
                  <label className="hover:bg-surface-2 flex cursor-pointer gap-3 rounded-md p-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checklist.includes(item)}
                      onChange={(e) =>
                        saveChallengeWork(key, {
                          checklist: e.target.checked
                            ? [...checklist, item]
                            : checklist.filter((c) => c !== item),
                        })
                      }
                    />
                    <span className="text-foreground">{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="rubrica" className="border-border bg-surface rounded-lg border p-5">
            <h2 id="rubrica" className="text-foreground mb-1 flex items-center gap-2 text-base font-semibold">
              <ClipboardList aria-hidden className="text-accent size-4" /> Autoevaluación con rúbrica
            </h2>
            <p className="text-muted mb-3 text-xs">
              Marcá sólo lo que tu diseño cubre de forma explícita, idealmente después de compararlo con el
              diseño de referencia. El puntaje es tuyo: no hay evaluación automática del texto.
            </p>
            <ul className="flex flex-col gap-1">
              {challenge.rubric.map((criterion) => (
                <li key={criterion.id}>
                  <label className="hover:bg-surface-2 flex cursor-pointer gap-3 rounded-md p-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={rubric.includes(criterion.id)}
                      onChange={(e) =>
                        saveChallengeWork(key, {
                          rubric: e.target.checked
                            ? [...rubric, criterion.id]
                            : rubric.filter((r) => r !== criterion.id),
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
      )}

      {interview && finished && (
        <div className="border-accent/40 bg-accent/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <p className="text-foreground text-sm">
            Compará tu diseño con la referencia, marcá la checklist y la rúbrica, y registrá el resultado de
            la sesión.
          </p>
          <Button onClick={submitEvaluation}>Registrar resultado</Button>
        </div>
      )}

      <section aria-labelledby="referencia" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="referencia" className="text-foreground mb-2 text-lg font-semibold">
          Diseño de referencia
        </h2>
        {solutionVisible ? (
          <div className="prose prose-sm reading-scale max-w-none">{solution}</div>
        ) : interview ? (
          <p className="text-muted text-sm">Se muestra al terminar la entrevista.</p>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted text-sm">
              Intentá completar las fases antes de mirarlo. No es la única respuesta correcta: es un diseño
              razonable con sus compromisos explicados.
            </p>
            <Button size="sm" variant="secondary" onClick={() => setShowSolution(true)}>
              <Eye /> Ver diseño de referencia
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
