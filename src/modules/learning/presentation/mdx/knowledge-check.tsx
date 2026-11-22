"use client";

import { BrainCircuit, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { useProgressActions, useProgressState } from "@/modules/progress/presentation/progress-context";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { InlineCodeText } from "@/shared/ui/inline-code-text";
import { useCurrentLesson } from "../lesson/lesson-context";

export interface KnowledgeCheckOption {
  text: string;
  correct?: boolean;
  /** Por qué esta opción es correcta o incorrecta. Se muestra para todas las opciones tras responder. */
  explanation: string;
}

export interface KnowledgeCheckProps {
  /** ID estable y único de la pregunta (p. ej. `typescript.runtime-vs-type-system.q1`); indexa el historial. */
  id: string;
  question: string;
  options: KnowledgeCheckOption[];
}

/**
 * Pregunta de opción única autocorregible. Tras comprobar, explica cada alternativa (no sólo la correcta),
 * porque entender por qué una opción es incorrecta es parte del aprendizaje.
 *
 * Dentro de una lección, cada comprobación se registra en el progreso (intentos y último resultado), lo que
 * alimenta las estadísticas y las recomendaciones por debilidad.
 */
export function KnowledgeCheck({ id, question, options }: KnowledgeCheckProps) {
  const groupId = useId();
  const lesson = useCurrentLesson();
  const record = useProgressState().questions[id];
  const { answer } = useProgressActions();
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const isCorrect = checked && selected !== null && options[selected]?.correct === true;

  const check = () => {
    if (selected === null) return;
    setChecked(true);
    if (lesson) answer(id, lesson.lessonId, options[selected]?.correct === true);
  };

  return (
    <section
      aria-labelledby={`${groupId}-q`}
      className="not-prose border-violet/30 from-violet/7 to-surface bg-surface my-8 rounded-xl border bg-gradient-to-b p-5 shadow-xs"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-violet flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
          <BrainCircuit aria-hidden className="size-4" /> Knowledge check
        </p>
        {record && !checked && (
          <p className="text-muted text-xs">
            Última respuesta: {record.lastCorrect ? "correcta" : "incorrecta"} · {record.attempts}{" "}
            {record.attempts === 1 ? "intento" : "intentos"}
          </p>
        )}
      </div>
      <p id={`${groupId}-q`} className="text-foreground mb-4 font-medium">
        <InlineCodeText text={question} />
      </p>

      <fieldset disabled={checked} className="flex min-w-0 flex-col gap-2">
        <legend className="sr-only">Opciones</legend>
        {options.map((option, index) => {
          const isSelected = selected === index;
          const showResult = checked && (isSelected || option.correct);
          return (
            <label
              key={option.text}
              className={cn(
                "has-focus-visible:outline-ring flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors has-focus-visible:outline-2",
                !checked &&
                  (isSelected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:border-accent/40 hover:bg-surface-2"),
                checked && option.correct && "border-success/60 bg-success/10",
                checked && isSelected && !option.correct && "border-danger/60 bg-danger/10",
                checked && !showResult && "border-border opacity-80",
              )}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name={groupId}
                  className="mt-0.5 accent-[var(--accent)]"
                  checked={isSelected}
                  onChange={() => setSelected(index)}
                />
                <span className="text-foreground min-w-0 flex-1">
                  <InlineCodeText text={option.text} />
                </span>
                {checked && option.correct && (
                  <CheckCircle2 aria-label="Correcta" className="text-success size-4" />
                )}
                {checked && isSelected && !option.correct && (
                  <XCircle aria-label="Incorrecta" className="text-danger size-4" />
                )}
              </span>
              {checked && (
                <span className="text-muted pl-7">
                  <InlineCodeText text={option.explanation} />
                </span>
              )}
            </label>
          );
        })}
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!checked ? (
          <Button size="sm" disabled={selected === null} onClick={check}>
            Comprobar
          </Button>
        ) : (
          <>
            <p
              role="status"
              className={cn("text-sm font-medium", isCorrect ? "text-success" : "text-danger")}
            >
              {isCorrect ? "¡Correcto!" : "No es correcta. Revisá la explicación de cada opción."}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setChecked(false);
                setSelected(null);
              }}
            >
              <RotateCcw /> Reintentar
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
