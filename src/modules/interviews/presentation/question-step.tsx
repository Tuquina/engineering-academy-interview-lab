"use client";

import { AlertTriangle, CheckCircle2, ChevronRight, MessageSquareMore, Timer, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import type { QuestionOutcome } from "../domain/history";
import { AREA_LABELS, coverage, type QuestionData } from "../domain/question";
import { formatClock, useElapsedSeconds } from "./use-elapsed";

type Stage = "answering" | "self-evaluating" | "feedback";

export interface QuestionStepProps {
  readonly question: QuestionData;
  readonly strongAnswer: ReactNode;
  readonly lessons: Readonly<Record<string, { title: string; href: string }>>;
  readonly onComplete: (outcome: QuestionOutcome) => void;
  readonly isLast: boolean;
}

/**
 * Una pregunta de entrevista: responder, autoevaluarse contra los criterios esperados y recibir el feedback de
 * referencia (criterios faltantes, respuesta sólida, errores frecuentes y seguimiento). Ninguna evaluación es
 * automática: el usuario decide qué criterios cubrió, después de ver la lista.
 */
export function QuestionStep({ question, strongAnswer, lessons, onComplete, isLast }: QuestionStepProps) {
  const [stage, setStage] = useState<Stage>("answering");
  const [answer, setAnswer] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [covered, setCovered] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());
  const elapsed = useElapsedSeconds(startedAt, stage === "answering");
  const suggested = question.format === "quick" ? 120 : 420;
  const result = coverage(question, covered);
  const deepDive = question.format === "deep-dive";
  const visibleFollowUps = deepDive ? followUpAnswers.length : 0;

  return (
    <article className="flex flex-col gap-4" aria-labelledby={`q-${question.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-xs">
          {AREA_LABELS[question.area]} · {deepDive ? "Deep dive" : "Pregunta rápida"}
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-sm tabular-nums",
            elapsed > suggested ? "text-warning" : "text-muted",
          )}
          aria-live="off"
        >
          <Timer aria-hidden className="size-4" /> {formatClock(elapsed)} / {formatClock(suggested)} sugeridos
        </p>
      </div>
      <h2 id={`q-${question.id}`} className="text-foreground text-xl font-semibold tracking-tight">
        {question.question}
      </h2>

      <label className="text-muted flex flex-col gap-1 text-sm">
        Tu respuesta
        <span className="text-xs">
          Escribila como la dirías, o respondé en voz alta y anotá los puntos clave. Nada se envía a ningún
          servidor.
        </span>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          readOnly={stage !== "answering"}
          rows={deepDive ? 8 : 5}
          className="border-border bg-background text-foreground mt-1 w-full resize-y rounded-md border p-3 text-sm leading-relaxed"
        />
      </label>

      {deepDive &&
        question.followUps.slice(0, visibleFollowUps).map((followUp, index) => (
          <label key={followUp} className="text-muted flex flex-col gap-1 text-sm">
            <span className="text-foreground flex items-center gap-2 font-medium">
              <MessageSquareMore aria-hidden className="text-accent size-4" /> Seguimiento: {followUp}
            </span>
            <textarea
              value={followUpAnswers[index] ?? ""}
              readOnly={stage !== "answering"}
              onChange={(e) =>
                setFollowUpAnswers((all) => all.map((value, i) => (i === index ? e.target.value : value)))
              }
              rows={3}
              className="border-border bg-background text-foreground w-full resize-y rounded-md border p-3 text-sm"
            />
          </label>
        ))}

      {stage === "answering" && (
        <div className="flex flex-wrap gap-2">
          {deepDive && visibleFollowUps < question.followUps.length && (
            <Button variant="secondary" onClick={() => setFollowUpAnswers((all) => [...all, ""])}>
              <MessageSquareMore /> Pregunta de seguimiento
            </Button>
          )}
          <Button onClick={() => setStage("self-evaluating")}>Ver criterios y autoevaluarme</Button>
        </div>
      )}

      {stage !== "answering" && (
        <section
          aria-labelledby={`criteria-${question.id}`}
          className="border-border bg-surface rounded-lg border p-4"
        >
          <h3 id={`criteria-${question.id}`} className="text-foreground text-sm font-semibold">
            Criterios esperados
          </h3>
          <p className="text-muted mb-2 text-xs">
            Marcá sólo los que tu respuesta cubrió de forma explícita. Es una autoevaluación: no hay
            corrección automática del texto.
          </p>
          <ul className="flex flex-col gap-1">
            {question.expectedPoints.map((point) => {
              const isCovered = covered.includes(point.id);
              return (
                <li key={point.id}>
                  {stage === "self-evaluating" ? (
                    <label className="hover:bg-surface-2 flex cursor-pointer gap-3 rounded-md p-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={isCovered}
                        onChange={(e) =>
                          setCovered((c) =>
                            e.target.checked ? [...c, point.id] : c.filter((x) => x !== point.id),
                          )
                        }
                      />
                      <span className="text-foreground">{point.point}</span>
                    </label>
                  ) : (
                    <p className="flex gap-2 p-1.5 text-sm">
                      {isCovered ? (
                        <CheckCircle2 aria-label="Cubierto" className="text-success mt-0.5 size-4 shrink-0" />
                      ) : (
                        <XCircle aria-label="Faltó" className="text-danger mt-0.5 size-4 shrink-0" />
                      )}
                      <span className={isCovered ? "text-foreground" : "text-foreground font-medium"}>
                        {point.point}
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {stage === "self-evaluating" && (
            <Button className="mt-3" onClick={() => setStage("feedback")}>
              Confirmar autoevaluación
            </Button>
          )}
        </section>
      )}

      {stage === "feedback" && (
        <>
          <p className="text-foreground text-sm" role="status">
            Cubriste {result.covered.length} de {question.expectedPoints.length} criterios.
            {result.missing.length > 0
              ? " Los faltantes quedan registrados como puntos débiles para repasar."
              : " No quedan puntos débiles en esta pregunta."}
          </p>
          <section className="border-border bg-surface rounded-lg border p-4">
            <h3 className="text-foreground mb-2 text-sm font-semibold">Una respuesta sólida</h3>
            <div className="prose prose-sm reading-scale max-w-none">{strongAnswer}</div>
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="border-border bg-surface rounded-lg border p-4">
              <h3 className="text-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle aria-hidden className="text-warning size-4" /> Errores frecuentes
              </h3>
              <ul className="text-muted list-disc space-y-1 pl-5 text-sm">
                {question.commonMistakes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
            <section className="border-border bg-surface rounded-lg border p-4">
              <h3 className="text-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                <MessageSquareMore aria-hidden className="text-accent size-4" /> Preguntas de seguimiento
              </h3>
              <ul className="text-muted list-disc space-y-1 pl-5 text-sm">
                {question.followUps.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          </div>
          {(question.relatedLessons.length > 0 || question.relatedPatterns.length > 0) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {question.relatedLessons
                .filter((id) => lessons[id])
                .map((id) => (
                  <Link
                    key={id}
                    href={lessons[id]!.href}
                    className="text-accent hover:underline"
                    target="_blank"
                  >
                    Lección: {lessons[id]!.title}
                  </Link>
                ))}
              {question.relatedPatterns.map((slug) => (
                <Link
                  key={slug}
                  href={`/patterns/${slug}`}
                  className="text-accent hover:underline"
                  target="_blank"
                >
                  Patrón: {slug}
                </Link>
              ))}
            </p>
          )}
          <div>
            <Button
              onClick={() =>
                onComplete({ questionId: question.id, covered: result.covered, missing: result.missing })
              }
            >
              {isLast ? "Terminar sesión" : "Siguiente"} <ChevronRight />
            </Button>
          </div>
        </>
      )}
    </article>
  );
}
