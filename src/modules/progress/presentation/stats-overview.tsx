"use client";

import Link from "next/link";
import { usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { useInterviewsState } from "@/modules/interviews/presentation/interviews-context";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { InlineCodeText } from "@/shared/ui/inline-code-text";
import { ProgressIndicator } from "@/shared/ui/progress-indicator";
import { summarizeProgress } from "../domain/progress";
import { minutesSeries, totalMinutes } from "../domain/study-stats";
import { useLearnerSnapshot, type LearnerData } from "./learner-data";
import { useProgressState } from "./progress-context";
import { StudyChart } from "./study-chart";

/**
 * Estadísticas de estudio. Sólo muestra lo que se registra: tiempo activo estimado, lecciones, respuestas a
 * knowledge checks y repasos de flashcards. No hay métricas inventadas ni comparaciones con otros usuarios.
 */
export function StatsOverview({ data }: { data: LearnerData }) {
  const isClient = useIsClient();
  const state = useProgressState();
  const snapshot = useLearnerSnapshot(data, isClient);
  const practice = usePracticeState();
  const interviews = useInterviewsState();

  if (!snapshot.ready || !snapshot.today) {
    return <div className="border-border bg-surface h-96 animate-pulse rounded-lg border" aria-hidden />;
  }

  const today = snapshot.today;
  const allLessonIds = data.courses.flatMap((c) => c.lessonIds);
  const lessonSummary = summarizeProgress(state, allLessonIds);
  const questionsByLesson = new Map<string, { answered: number; wrong: number }>();
  for (const record of Object.values(state.questions)) {
    const entry = questionsByLesson.get(record.lessonId) ?? { answered: 0, wrong: 0 };
    entry.answered++;
    if (!record.lastCorrect) entry.wrong++;
    questionsByLesson.set(record.lessonId, entry);
  }

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Racha actual", value: `${snapshot.streakDays} días` },
          { label: "Minutos (30 días)", value: String(totalMinutes(state.studySeconds, today, 30)) },
          { label: "Lecciones completadas", value: `${lessonSummary.completed}/${lessonSummary.total}` },
          { label: "Repasos de flashcards", value: String(snapshot.reviewedFlashcards) },
          {
            label: "Challenges resueltos",
            value: `${data.challenges.filter((c) => practice.attempts[c.id]?.solvedAt).length}/${data.challenges.length}`,
          },
          { label: "Entrevistas simuladas", value: String(interviews.sessions.length) },
        ].map((stat) => (
          <div key={stat.label} className="border-border bg-surface rounded-lg border p-4">
            <dt className="text-muted text-xs">{stat.label}</dt>
            <dd className="text-foreground mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <Card className="flex flex-col gap-3">
        <CardTitle>Tiempo de estudio activo · últimos 14 días</CardTitle>
        <CardDescription>
          Estimación conservadora: cuenta sólo tiempo con la pestaña visible e interacción en los últimos 2
          minutos, en lecciones y flashcards.
        </CardDescription>
        <StudyChart series={minutesSeries(state.studySeconds, today, 14)} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle>Knowledge checks por lección</CardTitle>
          {questionsByLesson.size === 0 ? (
            <CardDescription>Todavía no respondiste preguntas de evaluación.</CardDescription>
          ) : (
            <table className="text-sm">
              <thead>
                <tr className="text-muted text-left text-xs">
                  <th scope="col" className="pb-2 font-medium">
                    Lección
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Respondidas
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    A revisar
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...questionsByLesson.entries()].map(([lessonId, stats]) => {
                  const lesson = data.lessons[lessonId];
                  return (
                    <tr key={lessonId} className="border-border border-t">
                      <td className="py-2 pr-2">
                        {lesson ? (
                          <Link href={lesson.href} className="text-foreground hover:text-accent">
                            {lesson.title}
                          </Link>
                        ) : (
                          lessonId
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">{stats.answered}</td>
                      <td
                        className={`py-2 text-right tabular-nums ${stats.wrong > 0 ? "text-danger" : "text-success"}`}
                      >
                        {stats.wrong}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>Flashcards más difíciles</CardTitle>
          {snapshot.strugglingCards.length === 0 ? (
            <CardDescription>Ninguna tarjeta acumula fallos todavía.</CardDescription>
          ) : (
            <ul className="flex flex-col gap-3">
              {snapshot.strugglingCards.map((card) => (
                <li key={card.id} className="text-sm">
                  <p className="text-foreground">
                    <InlineCodeText text={card.front} />
                  </p>
                  <p className="text-muted text-xs">
                    {card.deckTitle} · {card.lapses} {card.lapses === 1 ? "fallo" : "fallos"}
                    {card.lessonId && data.lessons[card.lessonId] && (
                      <>
                        {" · "}
                        <Link
                          href={data.lessons[card.lessonId]!.href}
                          className="text-accent hover:underline"
                        >
                          repasar la lección
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <CardTitle>Progreso por curso</CardTitle>
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {data.courses.map((course) => {
            const summary = summarizeProgress(state, course.lessonIds);
            return (
              <li key={course.id} className="flex min-w-0 flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-foreground truncate">{course.title}</span>
                  <span className="text-muted shrink-0 text-xs tabular-nums">
                    {summary.total > 0 ? `${Math.round(summary.ratio * 100)}%` : "en preparación"}
                  </span>
                </div>
                <ProgressIndicator value={summary.ratio} label={`Progreso en ${course.title}`} />
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
