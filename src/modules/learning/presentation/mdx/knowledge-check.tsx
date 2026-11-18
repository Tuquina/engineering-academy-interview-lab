"use client";

import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { InlineCodeText } from "./inline-code-text";

export interface KnowledgeCheckOption {
  text: string;
  correct?: boolean;
  /** Por qué esta opción es correcta o incorrecta. Se muestra para todas las opciones tras responder. */
  explanation: string;
}

/**
 * Pregunta de opción única autocorregible. Tras comprobar, explica cada alternativa (no sólo la correcta),
 * porque entender por qué una opción es incorrecta es parte del aprendizaje.
 *
 * El resultado no se persiste todavía: el registro de respuestas e intentos llega con el módulo de quizzes (Fase 2).
 */
export function KnowledgeCheck({ question, options }: { question: string; options: KnowledgeCheckOption[] }) {
  const groupId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const isCorrect = checked && selected !== null && options[selected]?.correct === true;

  return (
    <section
      aria-labelledby={`${groupId}-q`}
      className="not-prose border-border bg-surface my-8 rounded-lg border p-5"
    >
      <p className="text-violet mb-1 text-xs font-semibold tracking-wide uppercase">Knowledge check</p>
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
                "flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2.5 text-sm transition-colors",
                !checked && (isSelected ? "border-accent bg-accent/8" : "border-border hover:bg-surface-2"),
                checked && option.correct && "border-success/60 bg-success/8",
                checked && isSelected && !option.correct && "border-danger/60 bg-danger/8",
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
          <Button size="sm" disabled={selected === null} onClick={() => setChecked(true)}>
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
