"use client";

import { CheckCircle2, ClipboardCheck, Play, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  ChallengeBrief,
  type ChallengeBriefContent,
} from "@/modules/challenges/presentation/challenge-brief";
import { usePracticeActions, usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { Button } from "@/shared/ui/button";
import { ResizablePanels } from "@/shared/ui/resizable-panels";
import { gradeSqlExercise, type GradeResult } from "../application/sql-engine";
import type { SqlExercise } from "../domain/sql-exercise";
import { ExecOutcomeView, SqlErrorView } from "./query-result-view";
import { useSqlSession } from "./use-sql-session";

const CodeEditor = dynamic(
  () => import("@/modules/exercises/presentation/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => <div className="text-muted p-4 text-sm">Cargando editor…</div>,
  },
);

const STARTER = "-- Escribí tu consulta acá. Fecha de referencia: 2026-11-15\nSELECT ";

/**
 * Ejercicio SQL autocorregible: se ejecuta la consulta del usuario y la de referencia sobre el mismo dataset (en
 * transacciones que se revierten) y se comparan los resultados. Se usa en el Database Lab y en challenges SQL.
 */
export function SqlExerciseWorkspace({
  dataset,
  exercise,
  attemptId,
  brief,
}: {
  dataset: string;
  exercise: SqlExercise;
  /** ID bajo el que se registran intentos y borrador (el del challenge o el del ejercicio). */
  attemptId: string;
  brief: ChallengeBriefContent;
}) {
  const practice = usePracticeState();
  const actions = usePracticeActions();
  const { engine, busy, outcome, execute, schema, initError } = useSqlSession(dataset);
  const [sql, setSql] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const currentSql = sql ?? practice.drafts[attemptId] ?? STARTER;
  const solved =
    Boolean(practice.attempts[attemptId]?.solvedAt) || (grade?.kind === "graded" && grade.outcome.correct);

  const run = useCallback(async () => {
    if (busy) return;
    actions.saveDraft(attemptId, currentSql);
    setGrade(null);
    // Las ejecuciones de prueba también se revierten: el dataset queda intacto para la corrección.
    await execute(currentSql, { rollback: true });
  }, [actions, attemptId, busy, currentSql, execute]);

  const check = useCallback(async () => {
    if (grading) return;
    setGrading(true);
    try {
      actions.saveDraft(attemptId, currentSql);
      const result = await gradeSqlExercise(engine, exercise, currentSql);
      setGrade(result);
      if (result.kind !== "reference-error") {
        const correct = result.kind === "graded" && result.outcome.correct;
        actions.recordAttempt(attemptId, { passed: correct ? 1 : 0, total: 1 });
      }
    } finally {
      setGrading(false);
    }
  }, [actions, attemptId, currentSql, engine, exercise, grading]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void (event.shiftKey ? check() : run());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run, check]);

  return (
    <ResizablePanels
      initialLeftPercent={40}
      className="h-[calc(100dvh-11rem)] min-h-[40rem]"
      left={
        <ChallengeBrief
          {...brief}
          solution={
            <>
              {brief.solutionExplanation}
              <h3>Consulta de referencia</h3>
              <pre>
                <code>{exercise.solution}</code>
              </pre>
            </>
          }
          solved={solved}
          onRevealSolution={() => actions.markSolutionRevealed(attemptId)}
        />
      }
      right={
        <div className="flex h-full flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted text-xs">
              {exercise.check.mode === "state"
                ? `La corrección ejecuta tu sentencia ${exercise.check.runTimes} veces y verifica el estado final.`
                : "La corrección compara tu resultado con el esperado (valores, filas y columnas)."}
            </p>
            <div className="ml-auto flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void run()}
                disabled={busy || !schema}
                title="Ctrl + Enter"
              >
                <Play /> Ejecutar
              </Button>
              <Button
                size="sm"
                onClick={() => void check()}
                disabled={grading || !schema}
                title="Ctrl + Shift + Enter"
              >
                <ClipboardCheck /> {grading ? "Corrigiendo…" : "Comprobar"}
              </Button>
            </div>
          </div>
          <div className="border-border h-64 shrink-0 overflow-hidden rounded-lg border">
            <CodeEditor
              path={`file:///sql/${attemptId}.sql`}
              value={currentSql}
              language="sql"
              onChange={(next) => {
                setSql(next);
                actions.saveDraft(attemptId, next);
              }}
              ariaLabel="Editor de la consulta"
            />
          </div>
          <section
            aria-label="Resultado"
            className="border-border bg-surface min-h-0 flex-1 overflow-y-auto rounded-lg border p-4"
            aria-live="polite"
          >
            {initError && (
              <p role="alert" className="text-danger text-sm">
                No se pudo iniciar PostgreSQL en el navegador: {initError}
              </p>
            )}
            {grade && <GradeView grade={grade} sql={currentSql} />}
            {!grade && outcome && <ExecOutcomeView outcome={outcome.result} sql={outcome.sql} />}
            {!grade && !outcome && !initError && (
              <p className="text-muted text-sm">
                {schema
                  ? "Ejecutá para ver el resultado (Ctrl + Enter) y comprobá cuando creas que está bien (Ctrl + Shift + Enter)."
                  : "Iniciando PostgreSQL en el navegador…"}
              </p>
            )}
            {solved && !grade && (
              <p className="text-success mt-3 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 aria-hidden className="size-4" /> Ya resolviste este ejercicio.
              </p>
            )}
          </section>
        </div>
      }
    />
  );
}

function GradeView({ grade, sql }: { grade: GradeResult; sql: string }) {
  if (grade.kind === "reference-error") {
    return (
      <p role="alert" className="text-danger text-sm">
        No se pudo ejecutar la solución de referencia: {grade.message}. Restablecé el dataset y volvé a
        intentar.
      </p>
    );
  }
  if (grade.kind === "user-error") return <SqlErrorView error={grade.error} sql={sql} />;
  const { outcome } = grade;
  return (
    <div className="flex flex-col gap-3">
      <p
        role="status"
        className={`flex items-center gap-2 text-sm font-semibold ${outcome.correct ? "text-success" : "text-danger"}`}
      >
        {outcome.correct ? (
          <CheckCircle2 aria-hidden className="size-4" />
        ) : (
          <XCircle aria-hidden className="size-4" />
        )}
        {outcome.message}
      </p>
      {outcome.notes.map((note) => (
        <p key={note} className="text-warning text-sm">
          {note}
        </p>
      ))}
      <ExecOutcomeView outcome={{ ok: true, results: grade.userResults, durationMs: 0 }} sql={sql} />
    </div>
  );
}
