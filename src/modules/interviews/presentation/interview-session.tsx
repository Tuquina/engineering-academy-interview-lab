"use client";

import { CheckCircle2, Play, RotateCcw, Timer, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  ArchitectureChallengeWorkspace,
  type ArchitectureChallengeData,
} from "@/modules/system-design/presentation/architecture-challenge-workspace";
import { challengeDocumentId } from "@/modules/system-design/domain/studio";
import { useStudioActions } from "@/modules/system-design/presentation/studio-context";
import { useIsClient } from "@/shared/lib/use-is-client";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import type { QuestionOutcome, SessionRecord } from "../domain/history";
import { AREA_LABELS, INTERVIEW_AREAS, type InterviewArea, type QuestionData } from "../domain/question";
import {
  EmptySessionError,
  MOCK_SECTION_LABELS,
  MOCK_SECTION_MINUTES,
  MODE_INFO,
  buildSession,
  type InterviewMode,
  type MockSections,
  type SessionPlan,
} from "../domain/session";
import { useInterviewsActions, useInterviewsState } from "./interviews-context";
import { LiveCodingStep, type LiveCodingChallenge } from "./live-coding-step";
import { QuestionStep } from "./question-step";
import { formatClock, useElapsedSeconds } from "./use-elapsed";

export interface SystemDesignChallengeContent {
  readonly data: ArchitectureChallengeData;
  readonly context: ReactNode;
  readonly solution: ReactNode;
}

export interface InterviewSessionProps {
  readonly mode: InterviewMode;
  readonly questions: readonly QuestionData[];
  readonly strongAnswers: Readonly<Record<string, ReactNode>>;
  readonly lessons: Readonly<Record<string, { title: string; href: string }>>;
  readonly systemDesign: readonly SystemDesignChallengeContent[];
  readonly codeChallenges: readonly LiveCodingChallenge[];
}

type Phase =
  | { kind: "setup" }
  | { kind: "running"; plan: SessionPlan; startedAt: number }
  | { kind: "summary"; record: SessionRecord };

const RANDOM_ALGORITHMS = "random:algorithms";
const RANDOM_PRACTICAL = "random:practical";

const DEFAULT_SECTIONS: MockSections = {
  behavioral: true,
  quick: true,
  deepDive: true,
  ai: true,
  systemDesign: true,
  liveCoding: false,
};

/** Configura, ejecuta y resume una sesión del Interview Arena. El resultado se registra en este navegador. */
export function InterviewSession(props: InterviewSessionProps) {
  const { mode } = props;
  const info = MODE_INFO[mode];
  const isClient = useIsClient();
  const interviews = useInterviewsState();
  const { recordSession } = useInterviewsActions();
  const studio = useStudioActions();
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [minutes, setMinutes] = useState(info.defaultMinutes);
  const [areas, setAreas] = useState<InterviewArea[]>([]);
  const [challengeId, setChallengeId] = useState("");
  const [sections, setSections] = useState<MockSections>(DEFAULT_SECTIONS);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const outcomes = useRef<QuestionOutcome[]>([]);
  const extras = useRef<Pick<SessionRecord, "systemDesign" | "liveCoding">>({});

  const weakIds = Object.entries(interviews.weakPoints)
    .sort(([, a], [, b]) => a.lastAnsweredAt.localeCompare(b.lastAnsweredAt))
    .map(([id]) => id);
  const questionsById = new Map(props.questions.map((q) => [q.id, q]));

  const start = () => {
    try {
      // "Al azar" puede acotarse a un tipo de problema de live coding.
      const pool =
        challengeId === RANDOM_ALGORITHMS
          ? props.codeChallenges.filter((c) => c.track === "algorithms")
          : challengeId === RANDOM_PRACTICAL
            ? props.codeChallenges.filter((c) => c.track === "practical")
            : props.codeChallenges;
      const chosen = challengeId.startsWith("random:") ? undefined : challengeId || undefined;
      const plan = buildSession(
        mode,
        { minutes, areas, challengeId: chosen, sections },
        {
          questions: props.questions,
          weakQuestionIds: weakIds,
          systemDesignChallengeIds: props.systemDesign.map((c) => c.data.id),
          codeChallengeIds: pool.map((c) => c.id),
        },
        Math.random,
        crypto.randomUUID(),
      );
      for (const step of plan.steps) {
        if (step.kind === "system-design") {
          const key = `interview:${step.challengeId}`;
          studio.resetChallengeWork(key, challengeDocumentId(key));
        }
      }
      outcomes.current = [];
      extras.current = {};
      setStepIndex(0);
      setError(null);
      setPhase({ kind: "running", plan, startedAt: Date.now() });
    } catch (e) {
      if (e instanceof EmptySessionError) setError(e.message);
      else throw e;
    }
  };

  const finish = (plan: SessionPlan, startedAt: number) => {
    const record: SessionRecord = {
      id: plan.id,
      mode,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      plannedMinutes: plan.plannedMinutes,
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
      questions: outcomes.current,
      ...extras.current,
    };
    recordSession(record);
    setPhase({ kind: "summary", record });
    window.scrollTo({ top: 0 });
  };

  if (phase.kind === "running") {
    return (
      <RunningSession
        {...props}
        plan={phase.plan}
        startedAt={phase.startedAt}
        stepIndex={stepIndex}
        onAdvance={() => {
          if (stepIndex + 1 >= phase.plan.steps.length) finish(phase.plan, phase.startedAt);
          else {
            setStepIndex(stepIndex + 1);
            window.scrollTo({ top: 0 });
          }
        }}
        onQuestion={(outcome) => outcomes.current.push(outcome)}
        onSystemDesign={(result) => {
          extras.current = { ...extras.current, systemDesign: result };
        }}
        onLiveCoding={(result) => {
          extras.current = { ...extras.current, liveCoding: result };
        }}
        onStop={() => finish(phase.plan, phase.startedAt)}
      />
    );
  }

  if (phase.kind === "summary") {
    const { record } = phase;
    return (
      <div className="flex flex-col gap-5">
        <section className="border-border bg-surface rounded-lg border p-5" aria-labelledby="resumen">
          <h2 id="resumen" className="text-foreground text-xl font-semibold">
            Resumen de la sesión
          </h2>
          <p className="text-muted mt-1 text-sm">
            Duración: {formatClock(record.elapsedSeconds)} (planificado {record.plannedMinutes} min). La
            sesión quedó registrada en tu historial; los criterios faltantes se suman a tus puntos débiles.
          </p>
          {record.questions.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {record.questions.map((outcome) => {
                const question = questionsById.get(outcome.questionId);
                if (!question) return null;
                const total = outcome.covered.length + outcome.missing.length;
                return (
                  <li key={outcome.questionId} className="border-border rounded-md border p-3">
                    <p className="text-foreground text-sm font-medium">{question.question}</p>
                    <p className="text-muted text-xs">
                      {AREA_LABELS[question.area]} · {outcome.covered.length}/{total} criterios
                    </p>
                    {outcome.missing.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                        {outcome.missing.map((id) => (
                          <li key={id} className="text-foreground flex gap-1.5">
                            <XCircle aria-hidden className="text-danger mt-0.5 size-3.5 shrink-0" />
                            {question.expectedPoints.find((p) => p.id === id)?.point}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {record.systemDesign && (
            <p className="text-foreground mt-4 text-sm">
              System design: {Math.round(record.systemDesign.score * 100)}% de la rúbrica (autoevaluado),{" "}
              {record.systemDesign.phasesWithNotes} de 8 fases con notas.
            </p>
          )}
          {record.liveCoding && (
            <p className="text-foreground mt-2 flex items-center gap-1.5 text-sm">
              {record.liveCoding.solved ? (
                <CheckCircle2 aria-hidden className="text-success size-4" />
              ) : (
                <XCircle aria-hidden className="text-danger size-4" />
              )}
              Live coding: {record.liveCoding.passed}/{record.liveCoding.total} tests en la última ejecución
              {record.liveCoding.solved ? " (resuelto)" : ""}.
            </p>
          )}
        </section>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPhase({ kind: "setup" })}>
            <RotateCcw /> Nueva sesión
          </Button>
          <Button asChild variant="secondary">
            <Link href="/interview">Volver al Interview Arena</Link>
          </Button>
        </div>
      </div>
    );
  }

  const showAreas = mode === "quick" || mode === "deep-dive";
  const totalMock = (Object.keys(sections) as (keyof MockSections)[])
    .filter((k) => sections[k])
    .reduce((sum, k) => sum + MOCK_SECTION_MINUTES[k], 0);

  return (
    <section
      className="border-border bg-surface flex flex-col gap-5 rounded-lg border p-5"
      aria-labelledby="config"
    >
      <h2 id="config" className="text-foreground text-lg font-semibold">
        Configurar la sesión
      </h2>

      {mode === "mock" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-foreground mb-1 text-sm font-medium">Secciones</legend>
          {(Object.keys(MOCK_SECTION_LABELS) as (keyof MockSections)[]).map((key) => (
            <label key={key} className="text-foreground flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sections[key]}
                onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.checked }))}
              />
              {MOCK_SECTION_LABELS[key]} <span className="text-muted">({MOCK_SECTION_MINUTES[key]} min)</span>
            </label>
          ))}
          <p className="text-muted text-sm">Duración total: {totalMock} minutos.</p>
        </fieldset>
      ) : mode !== "review" ? (
        <label className="text-muted flex max-w-md flex-col gap-1 text-sm">
          <span className="flex justify-between">
            Duración <span className="text-foreground font-medium tabular-nums">{minutes} min</span>
          </span>
          <input
            type="range"
            min={info.minMinutes}
            max={info.maxMinutes}
            step={mode === "quick" ? 1 : 5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="accent-[var(--accent)]"
          />
        </label>
      ) : (
        <p className="text-foreground text-sm">
          {isClient
            ? weakIds.length > 0
              ? `Tenés ${weakIds.length} ${weakIds.length === 1 ? "pregunta" : "preguntas"} con criterios faltantes.`
              : "Todavía no hay puntos débiles registrados."
            : "Cargando tu historial…"}
        </p>
      )}

      {showAreas && (
        <fieldset>
          <legend className="text-foreground mb-2 text-sm font-medium">Áreas (ninguna = todas)</legend>
          <div className="flex flex-wrap gap-1.5">
            {INTERVIEW_AREAS.filter((a) => a !== "ai-engineering" && a !== "behavioral").map((area) => {
              const active = areas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAreas((all) => (active ? all.filter((a) => a !== area) : [...all, area]))}
                  className={cn(
                    "border-border rounded-full border px-3 py-1 text-xs",
                    active
                      ? "bg-accent text-accent-foreground border-accent"
                      : "text-foreground hover:bg-surface-2",
                  )}
                >
                  {AREA_LABELS[area]}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {mode === "system-design" && (
        <label className="text-muted flex max-w-md flex-col gap-1 text-sm">
          Problema
          <select
            value={challengeId}
            onChange={(e) => setChallengeId(e.target.value)}
            className="border-border bg-background text-foreground rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">Al azar</option>
            {props.systemDesign.map((c) => (
              <option key={c.data.id} value={c.data.id}>
                {c.data.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {mode === "live-coding" && (
        <label className="text-muted flex max-w-md flex-col gap-1 text-sm">
          Problema
          <select
            value={challengeId}
            onChange={(e) => setChallengeId(e.target.value)}
            className="border-border bg-background text-foreground rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">Al azar (cualquiera)</option>
            <option value={RANDOM_ALGORITHMS}>Al azar: algoritmos (estilo LeetCode)</option>
            <option value={RANDOM_PRACTICAL}>Al azar: problemas prácticos de backend</option>
            {(["algorithms", "practical"] as const).map((track) => (
              <optgroup
                key={track}
                label={track === "algorithms" ? "Algoritmos y estructuras de datos" : "Problemas prácticos"}
              >
                {props.codeChallenges
                  .filter((c) => c.track === track)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <div>
        <Button size="lg" onClick={start} disabled={!isClient || (mode === "review" && weakIds.length === 0)}>
          <Play /> Comenzar
        </Button>
      </div>
    </section>
  );
}

function RunningSession({
  plan,
  startedAt,
  stepIndex,
  onAdvance,
  onQuestion,
  onSystemDesign,
  onLiveCoding,
  onStop,
  ...props
}: InterviewSessionProps & {
  plan: SessionPlan;
  startedAt: number;
  stepIndex: number;
  onAdvance: () => void;
  onQuestion: (outcome: QuestionOutcome) => void;
  onSystemDesign: (result: NonNullable<SessionRecord["systemDesign"]>) => void;
  onLiveCoding: (result: NonNullable<SessionRecord["liveCoding"]>) => void;
  onStop: () => void;
}) {
  const elapsed = useElapsedSeconds(startedAt);
  const step = plan.steps[stepIndex]!;
  const isLast = stepIndex === plan.steps.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5">
        <p className="text-foreground text-sm">
          <span className="font-medium">{step.section}</span>
          <span className="text-muted">
            {" "}
            · paso {stepIndex + 1} de {plan.steps.length}
          </span>
        </p>
        <p className="text-muted flex items-center gap-1.5 text-sm tabular-nums" aria-live="off">
          <Timer aria-hidden className="size-4" /> {formatClock(elapsed)} / {plan.plannedMinutes}:00
        </p>
        <Button size="sm" variant="ghost" onClick={onStop}>
          Terminar ahora
        </Button>
      </div>

      {step.kind === "question" && (
        <QuestionStep
          key={step.questionId}
          question={props.questions.find((q) => q.id === step.questionId)!}
          strongAnswer={props.strongAnswers[step.questionId]}
          lessons={props.lessons}
          isLast={isLast}
          onComplete={(outcome) => {
            onQuestion(outcome);
            onAdvance();
          }}
        />
      )}

      {step.kind === "system-design" &&
        (() => {
          const content = props.systemDesign.find((c) => c.data.id === step.challengeId)!;
          return (
            <>
              <h2 className="text-foreground text-xl font-semibold">{content.data.title}</h2>
              <ArchitectureChallengeWorkspace
                key={step.challengeId}
                challenge={content.data}
                context={content.context}
                solution={content.solution}
                workKey={`interview:${step.challengeId}`}
                interview={{
                  totalMinutes: step.minutes,
                  onFinish: (result) => {
                    onSystemDesign({
                      challengeId: step.challengeId,
                      score: result.score,
                      phasesWithNotes: result.phasesWithNotes,
                    });
                    onAdvance();
                  },
                }}
              />
            </>
          );
        })()}

      {step.kind === "live-coding" && (
        <LiveCodingStep
          key={step.challengeId}
          challenge={props.codeChallenges.find((c) => c.id === step.challengeId)!}
          minutes={step.minutes}
          onFinish={(result) => {
            onLiveCoding({
              challengeId: step.challengeId,
              solved: result.solved,
              passed: result.passed,
              total: result.total,
            });
            onAdvance();
          }}
        />
      )}
    </div>
  );
}
