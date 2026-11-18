"use client";

import { CheckCircle2, Lightbulb, ListChecks, Lock, MessagesSquare } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

type Tab = "statement" | "hints" | "solution";

/** Contenido informativo común a todos los tipos de challenge (preparado en el servidor). */
export interface ChallengeBriefContent {
  statement: ReactNode;
  solutionExplanation: ReactNode;
  constraints: readonly string[];
  acceptanceCriteria: readonly string[];
  hints: readonly string[];
  followUpQuestions: readonly string[];
}

/**
 * Columna informativa de un challenge: enunciado, criterios, pistas progresivas y solución (a pedido).
 * La solución no se oculta como castigo: se pide confirmación para que revelarla sea una decisión consciente.
 */
export function ChallengeBrief({
  statement,
  constraints,
  acceptanceCriteria,
  hints,
  followUpQuestions,
  solution,
  solved,
  onRevealSolution,
}: {
  statement: ReactNode;
  constraints: readonly string[];
  acceptanceCriteria: readonly string[];
  hints: readonly string[];
  followUpQuestions: readonly string[];
  /** Explicación (y, en código, la solución de referencia) ya renderizada. */
  solution: ReactNode;
  solved: boolean;
  onRevealSolution: () => void;
}) {
  const [tab, setTab] = useState<Tab>("statement");
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const tabs: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: "statement", label: "Enunciado" },
    { id: "hints", label: `Pistas (${hintsShown}/${hints.length})` },
    { id: "solution", label: "Solución" },
  ];

  return (
    <div className="border-border bg-surface flex h-full min-h-0 flex-col rounded-lg border">
      <div
        role="tablist"
        aria-label="Información del challenge"
        className="border-border flex gap-1 border-b px-2 pt-2"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.id
                ? "border-accent text-foreground font-medium"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === "statement" && (
          <div className="flex flex-col gap-6">
            <div className="prose prose-sm reading-scale max-w-none">{statement}</div>
            {constraints.length > 0 && (
              <section>
                <h3 className="text-foreground mb-2 text-sm font-semibold">Restricciones</h3>
                <ul className="text-foreground/90 list-disc pl-5 text-sm">
                  {constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h3 className="text-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                <ListChecks aria-hidden className="text-accent size-4" /> Criterios de aceptación
              </h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {acceptanceCriteria.map((c) => (
                  <li key={c} className="text-foreground/90 flex gap-2">
                    <CheckCircle2
                      aria-hidden
                      className={cn("mt-0.5 size-4 shrink-0", solved ? "text-success" : "text-muted")}
                    />
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "hints" && (
          <div className="flex flex-col gap-3">
            <p className="text-muted text-sm">
              Las pistas van de la más general a la más concreta. Pedí sólo las que necesites.
            </p>
            <ol className="flex flex-col gap-2">
              {hints.slice(0, hintsShown).map((hint, index) => (
                <li
                  key={hint}
                  className="border-warning/30 bg-warning/5 flex gap-2 rounded-md border p-3 text-sm"
                >
                  <Lightbulb aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="text-muted mr-1">{index + 1}.</span>
                    {hint}
                  </span>
                </li>
              ))}
            </ol>
            {hintsShown < hints.length ? (
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => setHintsShown((n) => n + 1)}
              >
                <Lightbulb /> Mostrar pista {hintsShown + 1}
              </Button>
            ) : (
              <p className="text-muted text-sm">No quedan más pistas.</p>
            )}
          </div>
        )}

        {tab === "solution" &&
          (solutionVisible || solved ? (
            <div className="flex flex-col gap-6">
              <div className="prose prose-sm reading-scale max-w-none">{solution}</div>
              {followUpQuestions.length > 0 && (
                <section className="border-border border-t pt-4">
                  <h3 className="text-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                    <MessagesSquare aria-hidden className="text-violet size-4" /> Preguntas de seguimiento
                  </h3>
                  <ul className="text-foreground/90 list-disc pl-5 text-sm">
                    {followUpQuestions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                <Lock aria-hidden className="text-muted size-4" /> Se muestra al resolverlo o a pedido
              </p>
              <p className="text-muted text-sm">
                Intentá primero con las pistas: el aprendizaje está en el esfuerzo de resolverlo. Si revelás
                la solución, queda registrado (sólo para tus estadísticas).
              </p>
              {!confirming ? (
                <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
                  Ver la solución de referencia
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSolutionVisible(true);
                      onRevealSolution();
                    }}
                  >
                    Sí, mostrarla
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                    Seguir intentando
                  </Button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
