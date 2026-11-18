"use client";

import { CheckCircle2, Layers } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toDayKey } from "@/shared/kernel/day-key";
import type { LessonIndex } from "@/shared/kernel/lesson-link";
import { cn } from "@/shared/lib/cn";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import type { Deck } from "../domain/deck";
import {
  RELEARN_DELAY_MINUTES,
  buildStudyQueue,
  scheduleReview,
  type Grade,
} from "../domain/spaced-repetition";
import { usePreferences } from "@/modules/preferences/presentation/preferences-context";
import { Flashcard, type GradeOption } from "./flashcard";
import { useFlashcardsActions, useFlashcardsState } from "./flashcards-context";
import { useNow } from "./use-now";

const GRADES: ReadonlyArray<Omit<GradeOption, "nextLabel">> = [
  { grade: 1, label: "Otra vez", tone: "danger" },
  { grade: 3, label: "Difícil", tone: "warning" },
  { grade: 4, label: "Bien", tone: "accent" },
  { grade: 5, label: "Fácil", tone: "success" },
];

function intervalLabel(days: number): string {
  if (days === 0) return `${RELEARN_DELAY_MINUTES} min`;
  return days === 1 ? "1 día" : `${days} días`;
}

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

/**
 * Sesión de repaso: muestra primero los repasos vencidos y luego las tarjetas nuevas habilitadas hoy.
 * Cada botón de calificación indica el intervalo que produciría, para que el algoritmo sea transparente.
 */
export function FlashcardsSession({ decks, lessons }: { decks: readonly Deck[]; lessons: LessonIndex }) {
  const state = useFlashcardsState();
  const { newFlashcardsPerDay } = usePreferences();
  const { review } = useFlashcardsActions();
  const now = useNow();
  const [deckFilter, setDeckFilter] = useState<string | null>(null);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);

  const deckById = useMemo(() => new Map(decks.map((d) => [d.id, d])), [decks]);
  const cards = useMemo(
    () => decks.filter((d) => deckFilter === null || d.id === deckFilter).flatMap((d) => d.cards),
    [decks, deckFilter],
  );

  const today = now ? toDayKey(now) : null;
  const queue = now && today ? buildStudyQueue(cards, state, now, today, newFlashcardsPerDay) : null;
  const current = queue ? (queue.due[0] ?? queue.fresh[0]) : undefined;
  const reviewedToday = today ? (state.reviewsByDay[today] ?? 0) : 0;

  const gradeOptions = useMemo<GradeOption[]>(() => {
    if (!current || !now || !today) return [];
    return GRADES.map((g) => ({
      ...g,
      nextLabel: intervalLabel(scheduleReview(state.schedules[current.id], g.grade, now, today).intervalDays),
    }));
  }, [current, now, today, state.schedules]);

  const onGrade = useCallback(
    (grade: Grade) => {
      if (!current) return;
      review(current.id, grade);
      setRevealedCardId(null);
    },
    [current, review],
  );
  const onReveal = useCallback(() => setRevealedCardId(current?.id ?? null), [current]);

  const nextDue = Object.entries(state.schedules)
    .filter(([id]) => cards.some((c) => c.id === id))
    .map(([, s]) => s.dueAt)
    .sort()[0];

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Repasos vencidos", value: queue?.due.length },
          { label: "Nuevas para hoy", value: queue?.fresh.length },
          { label: "Repasadas hoy", value: now ? reviewedToday : undefined },
          { label: "Tarjetas en total", value: cards.length },
        ].map((stat) => (
          <div key={stat.label} className="border-border bg-surface rounded-lg border p-4">
            <dt className="text-muted text-xs">{stat.label}</dt>
            <dd className="text-foreground mt-1 text-2xl font-semibold tabular-nums">{stat.value ?? "–"}</dd>
          </div>
        ))}
      </dl>

      <div role="group" aria-label="Filtrar por mazo" className="flex flex-wrap gap-2">
        {[{ id: null, title: "Todos los mazos" }, ...decks].map((deck) => (
          <button
            key={deck.id ?? "all"}
            type="button"
            aria-pressed={deckFilter === deck.id}
            onClick={() => setDeckFilter(deck.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              deckFilter === deck.id
                ? "border-accent bg-accent/12 text-accent"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            {deck.title}
          </button>
        ))}
      </div>

      {!queue ? (
        <div className="border-border bg-surface min-h-80 animate-pulse rounded-xl border" aria-hidden />
      ) : current ? (
        <Flashcard
          key={current.id}
          card={current}
          deckTitle={deckById.get(current.deckId)?.title ?? current.deckId}
          lesson={current.lessonId ? lessons[current.lessonId] : undefined}
          revealed={revealedCardId === current.id}
          onReveal={onReveal}
          gradeOptions={gradeOptions}
          onGrade={onGrade}
        />
      ) : (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 aria-hidden className="text-success size-8" />
          <CardTitle>No hay repasos pendientes</CardTitle>
          <CardDescription>
            {queue.freshRemaining > 0
              ? `Quedan ${queue.freshRemaining} tarjetas nuevas para los próximos días (límite diario: ${newFlashcardsPerDay}).`
              : "Ya viste todas las tarjetas de esta selección."}
            {nextDue ? ` Próximo repaso: ${dateFormat.format(new Date(nextDue))}.` : ""}
          </CardDescription>
        </Card>
      )}

      <p className="text-muted flex items-center gap-2 text-xs">
        <Layers aria-hidden className="size-3.5" />
        Repetición espaciada con una adaptación de SM-2: cada respuesta ajusta cuándo vuelve a aparecer la
        tarjeta.
      </p>
    </div>
  );
}
