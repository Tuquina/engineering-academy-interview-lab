"use client";

import { CheckCircle2, Circle, CircleDot, Play, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { exerciseStatus } from "@/modules/exercises/domain/practice";
import { usePracticeActions, usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { DIFFICULTY_LABELS, type Difficulty } from "@/modules/learning/domain/catalog-types";
import { Button } from "@/shared/ui/button";
import { ResizablePanels } from "@/shared/ui/resizable-panels";
import { ExecOutcomeView } from "./query-result-view";
import { SchemaBrowser } from "./schema-browser";
import { useSqlSession } from "./use-sql-session";

const CodeEditor = dynamic(
  () => import("@/modules/exercises/presentation/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => <div className="text-muted p-4 text-sm">Cargando editor…</div>,
  },
);

const DRAFT_ID = "sql-playground";
const DEFAULT_QUERY = `-- Fecha de referencia del dataset: 2026-11-15
SELECT c.full_name, l.id AS loan_id, l.status, l.principal_cents
FROM customers c
JOIN loans l ON l.customer_id = c.id
ORDER BY c.full_name
LIMIT 20;`;

export interface ExerciseLink {
  readonly id: string;
  readonly title: string;
  readonly difficulty: Difficulty;
  readonly topics: readonly string[];
}

/**
 * SQL Playground libre sobre el dataset de cobranzas: PostgreSQL real en el navegador, con esquema visible,
 * resultados tabulares, errores con posición y reset del dataset.
 */
export function SqlPlayground({
  dataset,
  exercises,
}: {
  dataset: string;
  exercises: readonly ExerciseLink[];
}) {
  const practice = usePracticeState();
  const { saveDraft } = usePracticeActions();
  const { schema, busy, outcome, execute, reset, initError } = useSqlSession(dataset);
  const [sql, setSql] = useState<string | null>(null);
  const currentSql = sql ?? practice.drafts[DRAFT_ID] ?? DEFAULT_QUERY;

  const run = useCallback(async () => {
    if (busy) return;
    saveDraft(DRAFT_ID, currentSql);
    await execute(currentSql, { rollback: false });
  }, [busy, currentSql, execute, saveDraft]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run]);

  return (
    <ResizablePanels
      initialLeftPercent={28}
      minPercent={20}
      className="min-h-[36rem]"
      left={
        <div className="flex flex-col gap-4">
          <section className="border-border bg-surface rounded-lg border p-4">
            <h2 className="text-foreground mb-3 text-sm font-semibold">Ejercicios autocorregibles</h2>
            <ul className="flex flex-col gap-1">
              {exercises.map((exercise) => {
                const status = exerciseStatus(practice, exercise.id);
                const Icon = status === "solved" ? CheckCircle2 : status === "attempted" ? CircleDot : Circle;
                return (
                  <li key={exercise.id}>
                    <Link
                      href={`/database-lab/${exercise.id.replace(/^sql\./, "")}`}
                      className="hover:bg-surface-2 flex items-start gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <Icon
                        aria-label={
                          status === "solved"
                            ? "Resuelto"
                            : status === "attempted"
                              ? "Intentado"
                              : "Pendiente"
                        }
                        className={`mt-0.5 size-4 shrink-0 ${status === "solved" ? "text-success" : status === "attempted" ? "text-accent" : "text-muted/60"}`}
                      />
                      <span className="min-w-0">
                        <span className="text-foreground block">{exercise.title}</span>
                        <span className="text-muted text-xs">
                          {DIFFICULTY_LABELS[exercise.difficulty]} · {exercise.topics.join(", ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="border-border bg-surface rounded-lg border p-4">
            <h2 className="text-foreground mb-3 text-sm font-semibold">Esquema</h2>
            {initError ? (
              <p role="alert" className="text-danger text-sm">
                No se pudo iniciar PostgreSQL en el navegador: {initError}
              </p>
            ) : (
              <SchemaBrowser
                schema={schema}
                onPreviewTable={(table) => setSql(`SELECT *\nFROM ${table}\nLIMIT 20;`)}
              />
            )}
          </section>
        </div>
      }
      right={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted text-xs">
              PostgreSQL compilado a WebAssembly (PGlite), aislado en tu navegador. Los cambios no afectan
              ninguna base real.
            </p>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => void reset()} disabled={busy}>
                <RotateCcw /> Restablecer dataset
              </Button>
              <Button size="sm" onClick={() => void run()} disabled={busy || !schema} title="Ctrl + Enter">
                <Play /> {busy ? "Ejecutando…" : "Ejecutar"}
              </Button>
            </div>
          </div>
          <div className="border-border h-72 overflow-hidden rounded-lg border">
            <CodeEditor
              path="file:///sql/playground.sql"
              value={currentSql}
              language="sql"
              onChange={(next) => {
                setSql(next);
                saveDraft(DRAFT_ID, next);
              }}
              ariaLabel="Editor SQL"
            />
          </div>
          <section
            aria-label="Resultado"
            className="border-border bg-surface min-h-40 rounded-lg border p-4"
            aria-live="polite"
          >
            {outcome ? (
              <ExecOutcomeView outcome={outcome.result} sql={outcome.sql} />
            ) : (
              <p className="text-muted text-sm">
                {schema
                  ? "Ejecutá la consulta con el botón o con Ctrl + Enter."
                  : "Iniciando PostgreSQL en el navegador…"}
              </p>
            )}
          </section>
        </div>
      }
    />
  );
}
