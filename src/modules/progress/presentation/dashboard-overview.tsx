"use client";

import {
  ArrowRight,
  Boxes,
  Flame,
  History,
  Lightbulb,
  MessagesSquare,
  PlayCircle,
  Swords,
  Target,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { ProgressIndicator } from "@/shared/ui/progress-indicator";
import { findNextLesson, recentLessons, summarizeProgress } from "../domain/progress";
import { useLearnerSnapshot, type LearnerData } from "./learner-data";
import { useProgressState } from "./progress-context";

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border-border bg-surface rounded-lg border p-4">
      <dt className="text-muted flex items-center gap-1.5 text-xs">
        <Icon aria-hidden className="size-3.5" /> {label}
      </dt>
      <dd className="text-foreground mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      <dd className="text-muted text-xs">{hint}</dd>
    </div>
  );
}

/**
 * Panel principal: qué estudiar ahora, por qué, y cómo viene la preparación. Todas las métricas provienen de lo
 * que efectivamente se registró en este navegador; durante la carga se muestran guiones, no ceros inventados.
 */
export function DashboardOverview({ data }: { data: LearnerData }) {
  const isClient = useIsClient();
  const state = useProgressState();
  const snapshot = useLearnerSnapshot(data, isClient);
  const pathLessonIds = snapshot.activePath?.lessonIds ?? [];
  const pathSummary = summarizeProgress(state, pathLessonIds);
  const nextLessonId = findNextLesson(state, pathLessonIds);
  const nextLesson = nextLessonId ? data.lessons[nextLessonId] : undefined;
  const recent = recentLessons(state, 5).filter((r) => data.lessons[r.id]);
  const show = (value: string) => (snapshot.ready ? value : "–");
  const practice = usePracticeState();
  // Siguiente challenge sugerido: el primero del catálogo (ordenado por dificultad creciente) sin resolver.
  const nextChallenge = data.challenges.find((c) => !practice.attempts[c.id]?.solvedAt);
  const solvedChallenges = data.challenges.filter((c) => practice.attempts[c.id]?.solvedAt).length;

  return (
    <div className="flex flex-col gap-6">
      <Card className="from-accent/8 border-accent/30 flex flex-col gap-5 bg-gradient-to-br to-transparent p-6">
        <div>
          <p className="text-accent text-xs font-semibold tracking-wide uppercase">
            Siguiente paso recomendado
          </p>
          {nextLesson ? (
            <>
              <h2 className="text-foreground mt-2 text-xl font-semibold">{nextLesson.title}</h2>
              <p className="text-muted mt-1 text-sm">
                {nextLesson.courseTitle} · {nextLesson.estimatedMinutes} min
                {state.lessons[nextLesson.id] ? " · en curso" : ""}
              </p>
            </>
          ) : (
            <p className="text-foreground mt-2">
              {pathSummary.total > 0
                ? "Completaste todas las lecciones publicadas de tu ruta activa."
                : "Tu ruta activa todavía no tiene lecciones publicadas."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {nextLesson ? (
            <Button asChild size="lg">
              <Link href={nextLesson.href}>
                <PlayCircle /> Continuar estudiando
              </Link>
            </Button>
          ) : (
            <Button size="lg" disabled>
              <PlayCircle /> Continuar estudiando
            </Button>
          )}
          <Button asChild size="lg" variant="secondary">
            <Link href="/interview/quick">
              <MessagesSquare /> Practicar para entrevista
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href={nextChallenge?.href ?? "/challenges"} title={nextChallenge?.title}>
              <Swords /> Resolver un desafío
            </Link>
          </Button>
        </div>
        {snapshot.ready && data.challenges.length > 0 && (
          <p className="text-muted text-xs">
            Challenges resueltos: {solvedChallenges}/{data.challenges.length}
            {nextChallenge ? ` · siguiente: ${nextChallenge.title}` : ""}.
          </p>
        )}
      </Card>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={Flame}
          label="Racha de estudio"
          value={show(`${snapshot.streakDays} ${snapshot.streakDays === 1 ? "día" : "días"}`)}
          hint="Días seguidos con 5+ min activos"
        />
        <Metric
          icon={Timer}
          label="Últimos 7 días"
          value={show(`${snapshot.minutesLast7Days} min`)}
          hint="Tiempo activo estimado"
        />
        <Metric
          icon={Boxes}
          label="Flashcards vencidas"
          value={show(String(snapshot.dueFlashcards))}
          hint={`${snapshot.reviewedFlashcards} repasos en total`}
        />
        <Metric
          icon={Target}
          label="Precisión en quizzes"
          value={show(
            snapshot.quiz.answered > 0 ? `${Math.round(snapshot.quiz.accuracy * 100)}%` : "Sin datos",
          )}
          hint={`${snapshot.quiz.answered} preguntas respondidas`}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb aria-hidden className="text-warning size-4" /> Qué practicar hoy
          </CardTitle>
          {!snapshot.ready ? (
            <CardDescription>Calculando recomendaciones…</CardDescription>
          ) : snapshot.recommendations.length === 0 ? (
            <CardDescription>No hay recomendaciones: todo al día.</CardDescription>
          ) : (
            <ol className="flex flex-col gap-2">
              {snapshot.recommendations.map((rec) => (
                <li key={rec.id}>
                  <Link href={rec.href} className="hover:bg-surface-2 block rounded-md px-2 py-1.5">
                    <span className="text-foreground block text-sm font-medium">{rec.title}</span>
                    <span className="text-muted text-xs">{rec.reason}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <CardTitle>Ruta activa</CardTitle>
            {snapshot.activePath ? (
              <CardDescription>
                <Link href={snapshot.activePath.href} className="text-accent hover:underline">
                  {snapshot.activePath.title}
                </Link>
              </CardDescription>
            ) : (
              <CardDescription>No hay rutas publicadas.</CardDescription>
            )}
          </div>
          {snapshot.activePath && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Lecciones completadas</span>
                <span className="text-foreground font-medium tabular-nums">
                  {pathSummary.completed}/{pathSummary.total}
                </span>
              </div>
              <ProgressIndicator value={pathSummary.ratio} label="Progreso de la ruta activa" />
            </div>
          )}
          <div className="border-border border-t pt-4">
            <p className="text-foreground mb-2 flex items-center gap-2 text-sm font-medium">
              <History aria-hidden className="text-muted size-4" /> Últimas lecciones visitadas
            </p>
            {recent.length === 0 ? (
              <CardDescription>Todavía no abriste ninguna lección.</CardDescription>
            ) : (
              <ul className="flex flex-col gap-1">
                {recent.map((entry) => {
                  const lesson = data.lessons[entry.id];
                  if (!lesson) return null;
                  return (
                    <li key={entry.id}>
                      <Link
                        href={lesson.href}
                        className="hover:bg-surface-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                      >
                        <span className="text-foreground truncate">{lesson.title}</span>
                        <span className="text-muted shrink-0 text-xs">
                          {entry.status === "completed" ? "completada" : "en curso"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <CardTitle>Avance por curso</CardTitle>
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {data.courses.map((course) => {
            const summary = summarizeProgress(state, course.lessonIds);
            return (
              <li key={course.id} className="flex min-w-0 flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-sm">
                  <Link href={course.href} className="text-foreground hover:text-accent truncate">
                    {course.title}
                  </Link>
                  <span className="text-muted shrink-0 text-xs tabular-nums">
                    {summary.total > 0 ? `${summary.completed}/${summary.total}` : "en preparación"}
                  </span>
                </div>
                <ProgressIndicator value={summary.ratio} label={`Progreso en ${course.title}`} />
              </li>
            );
          })}
        </ul>
        <Link href="/stats" className="text-accent inline-flex items-center gap-1 text-sm hover:underline">
          Ver estadísticas detalladas <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </Card>
    </div>
  );
}
