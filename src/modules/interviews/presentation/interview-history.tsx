"use client";

import { History, Target } from "lucide-react";
import Link from "next/link";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Button } from "@/shared/ui/button";
import { ProgressIndicator } from "@/shared/ui/progress-indicator";
import { statsByArea } from "../domain/history";
import type { QuestionData } from "../domain/question";
import { MODE_INFO } from "../domain/session";
import { useInterviewsState } from "./interviews-context";
import { formatClock } from "./use-elapsed";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

/** Historial de sesiones, cobertura por área y acceso al repaso de puntos débiles. */
export function InterviewHistory({ questions }: { questions: readonly QuestionData[] }) {
  const isClient = useIsClient();
  const state = useInterviewsState();
  if (!isClient)
    return <div className="border-border bg-surface h-48 animate-pulse rounded-lg border" aria-hidden />;

  const stats = statsByArea(state, questions).filter((s) => s.answered > 0);
  const weakCount = Object.keys(state.weakPoints).length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="debiles" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="debiles" className="text-foreground mb-3 flex items-center gap-2 font-semibold">
          <Target aria-hidden className="text-accent size-4" /> Cobertura por área
        </h2>
        {stats.length === 0 ? (
          <p className="text-muted text-sm">
            Todavía no registraste respuestas. Después de cada pregunta te autoevaluás contra sus criterios, y
            acá aparece tu cobertura por área.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {stats.map((s) => (
              <li key={s.area}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-foreground">{s.label}</span>
                  <span className="text-muted tabular-nums">
                    {Math.round(s.averageCoverage * 100)}% · {s.answered} resp.
                    {s.weakQuestions > 0 ? ` · ${s.weakQuestions} débiles` : ""}
                  </span>
                </div>
                <ProgressIndicator value={s.averageCoverage} label={`Cobertura en ${s.label}`} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-muted text-sm">
            {weakCount > 0
              ? `${weakCount} ${weakCount === 1 ? "pregunta" : "preguntas"} con criterios faltantes.`
              : "Sin puntos débiles registrados."}
          </p>
          {weakCount > 0 && (
            <Button asChild size="sm">
              <Link href="/interview/review">Repasar puntos débiles</Link>
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="historial" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="historial" className="text-foreground mb-3 flex items-center gap-2 font-semibold">
          <History aria-hidden className="text-accent size-4" /> Últimas sesiones
        </h2>
        {state.sessions.length === 0 ? (
          <p className="text-muted text-sm">Las sesiones terminadas aparecen acá.</p>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {state.sessions.slice(0, 8).map((session) => {
              const answered = session.questions.length;
              const covered = session.questions.reduce((sum, q) => sum + q.covered.length, 0);
              const total = session.questions.reduce(
                (sum, q) => sum + q.covered.length + q.missing.length,
                0,
              );
              return (
                <li key={session.id} className="py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-foreground font-medium">{MODE_INFO[session.mode].title}</span>
                    <span className="text-muted text-xs">
                      {dateFormat.format(new Date(session.finishedAt))}
                    </span>
                  </div>
                  <p className="text-muted text-xs">
                    {formatClock(session.elapsedSeconds)}
                    {answered > 0 ? ` · ${answered} preguntas · ${covered}/${total} criterios` : ""}
                    {session.systemDesign
                      ? ` · rúbrica ${Math.round(session.systemDesign.score * 100)}%`
                      : ""}
                    {session.liveCoding
                      ? ` · ${session.liveCoding.passed}/${session.liveCoding.total} tests${session.liveCoding.solved ? " (resuelto)" : ""}`
                      : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
