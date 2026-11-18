"use client";

import { ArrowRight, History, MessagesSquare, PlayCircle, Swords } from "lucide-react";
import Link from "next/link";
import { findNextLesson, recentLessons, summarizeProgress } from "../domain/progress";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { ProgressIndicator } from "@/shared/ui/progress-indicator";
import { useProgressState } from "./progress-context";

/** Datos serializables que el servidor prepara para el dashboard. */
export interface DashboardLesson {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly courseTitle: string;
  readonly estimatedMinutes: number;
}

export interface DashboardData {
  readonly activePath: {
    readonly title: string;
    readonly href: string;
    readonly lessonIds: readonly string[];
  } | null;
  readonly courses: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly href: string;
    readonly lessonIds: readonly string[];
  }>;
  readonly lessons: Readonly<Record<string, DashboardLesson>>;
}

/**
 * Panel principal. Calcula todo a partir del progreso registrado; no muestra métricas que todavía no se
 * registran (rachas, minutos, rendimiento en evaluaciones): esas tarjetas llegan con la Fase 2.
 */
export function DashboardOverview({ data }: { data: DashboardData }) {
  const state = useProgressState();
  const pathLessonIds = data.activePath?.lessonIds ?? [];
  const pathSummary = summarizeProgress(state, pathLessonIds);
  const nextLessonId = findNextLesson(state, pathLessonIds);
  const nextLesson = nextLessonId ? data.lessons[nextLessonId] : undefined;
  const recent = recentLessons(state, 5).filter((r) => data.lessons[r.id]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-accent/30 from-accent/8 flex flex-col gap-5 bg-gradient-to-br to-transparent p-6">
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
          <Button size="lg" variant="secondary" disabled title="Interview Arena llega en la Fase 4">
            <MessagesSquare /> Practicar para entrevista
          </Button>
          <Button size="lg" variant="secondary" disabled title="Challenges llega en la Fase 3">
            <Swords /> Resolver un desafío
          </Button>
        </div>
        <p className="text-muted text-xs">
          «Practicar para entrevista» y «Resolver un desafío» se habilitan cuando existan Interview Arena
          (Fase 4) y Challenges (Fase 3).
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div>
            <CardTitle>Ruta activa</CardTitle>
            {data.activePath ? (
              <CardDescription>
                <Link href={data.activePath.href} className="text-accent hover:underline">
                  {data.activePath.title}
                </Link>
              </CardDescription>
            ) : (
              <CardDescription>No hay rutas publicadas.</CardDescription>
            )}
          </div>
          {data.activePath && (
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
        </Card>

        <Card className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2">
            <History aria-hidden className="text-muted size-4" /> Últimas lecciones visitadas
          </CardTitle>
          {recent.length === 0 ? (
            <CardDescription>
              Todavía no abriste ninguna lección. Empezá por el siguiente paso recomendado.
            </CardDescription>
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
        <Link href="/library" className="text-accent inline-flex items-center gap-1 text-sm hover:underline">
          Ver la biblioteca completa <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </Card>
    </div>
  );
}
