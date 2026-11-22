"use client";

import { ArrowRight, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { isTypingTarget } from "@/shared/layout/keyboard-navigation";
import { cn } from "@/shared/lib/cn";
import type { LessonLink } from "@/shared/kernel/lesson-link";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { InlineCodeText } from "@/shared/ui/inline-code-text";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import type { Flashcard as FlashcardData } from "../domain/deck";
import type { Grade } from "../domain/spaced-repetition";

export interface GradeOption {
  readonly grade: Grade;
  readonly label: string;
  /** Texto con el próximo intervalo que produciría esta calificación (transparencia del algoritmo). */
  readonly nextLabel: string;
  readonly tone: "danger" | "warning" | "accent" | "success";
}

const TONES = {
  danger: "border-danger/40 hover:bg-danger/10 text-danger",
  warning: "border-warning/40 hover:bg-warning/10 text-warning",
  accent: "border-accent/40 hover:bg-accent/10 text-accent",
  success: "border-success/40 hover:bg-success/10 text-success",
} as const;

/**
 * Tarjeta de estudio con revelado de respuesta y calificación. Atajos: Espacio/Enter para mostrar la respuesta
 * y 1–4 para calificar.
 */
export function Flashcard({
  card,
  deckTitle,
  lesson,
  revealed,
  onReveal,
  gradeOptions,
  onGrade,
}: {
  card: FlashcardData;
  deckTitle: string;
  lesson: LessonLink | undefined;
  revealed: boolean;
  onReveal: () => void;
  gradeOptions: readonly GradeOption[];
  onGrade: (grade: Grade) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        onReveal();
        return;
      }
      const option = revealed ? gradeOptions[Number(event.key) - 1] : undefined;
      if (option) onGrade(option.grade);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed, onReveal, onGrade, gradeOptions]);

  return (
    <article
      aria-label="Tarjeta de estudio"
      className="border-border bg-surface flex min-h-80 flex-col gap-5 rounded-xl border p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="violet">{deckTitle}</Badge>
        <Badge tone={DIFFICULTY_TONES[card.difficulty]}>{DIFFICULTY_LABELS[card.difficulty]}</Badge>
        {card.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>

      <p className="text-foreground text-lg leading-relaxed font-medium sm:text-xl">
        <InlineCodeText text={card.front} />
      </p>

      {revealed ? (
        <div className="border-border flex flex-1 flex-col gap-4 border-t pt-5">
          <p className="text-foreground/90 leading-relaxed" aria-live="polite">
            <InlineCodeText text={card.back} />
          </p>
          {lesson && (
            <Link
              href={lesson.href}
              className="text-accent inline-flex items-center gap-1 text-sm hover:underline"
            >
              Profundizar en «{lesson.title}» <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          )}
          <div className="mt-auto">
            <p className="text-muted mb-2 text-sm">¿Qué tan bien la recordaste?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {gradeOptions.map((option, index) => (
                <button
                  key={option.grade}
                  type="button"
                  onClick={() => onGrade(option.grade)}
                  className={cn(
                    "focus-visible:outline-ring flex flex-col items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    TONES[option.tone],
                  )}
                >
                  <span>
                    <kbd className="mr-1 font-mono text-xs opacity-70">{index + 1}</kbd>
                    {option.label}
                  </span>
                  <span className="text-muted text-xs font-normal">{option.nextLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-auto">
          <Button size="lg" onClick={onReveal} className="w-full sm:w-auto">
            <Eye /> Mostrar respuesta
            <kbd className="ml-1 font-mono text-xs opacity-70">Espacio</kbd>
          </Button>
        </div>
      )}
    </article>
  );
}
