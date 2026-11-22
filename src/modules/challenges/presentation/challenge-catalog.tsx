"use client";

import { CheckCircle2, CircleDot, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { exerciseStatus } from "@/modules/exercises/domain/practice";
import { usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { DIFFICULTY_LABELS, type Difficulty } from "@/modules/learning/domain/catalog-types";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";
import {
  CHALLENGE_KIND_LABELS,
  INTERVIEW_TYPE_LABELS,
  filterChallenges,
  type ChallengeFilters,
  type ChallengeKind,
  type ChallengeSummary,
  type InterviewType,
} from "../domain/challenge";

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T | "") => void;
}) {
  return (
    <label className="text-muted flex flex-col gap-1 text-xs">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T | "")}
        className="border-border bg-surface text-foreground rounded-md border px-2 py-1.5 text-sm"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Catálogo de challenges con filtros (tipo, tecnología, dificultad, tipo de entrevista) y estado de resolución. */
export function ChallengeCatalog({ challenges }: { challenges: readonly ChallengeSummary[] }) {
  const practice = usePracticeState();
  const [filters, setFilters] = useState<ChallengeFilters>({});
  const technologies = useMemo(
    () => [...new Set(challenges.flatMap((c) => c.technologies))].sort(),
    [challenges],
  );
  const visible = filterChallenges(challenges, filters);
  const solvedCount = challenges.filter((c) => exerciseStatus(practice, c.id) === "solved").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <Select<ChallengeKind>
          label="Tipo"
          value={filters.kind ?? ""}
          options={(Object.keys(CHALLENGE_KIND_LABELS) as ChallengeKind[]).map((k) => ({
            value: k,
            label: CHALLENGE_KIND_LABELS[k],
          }))}
          onChange={(kind) => setFilters((f) => ({ ...f, kind: kind || undefined }))}
        />
        <Select
          label="Tecnología"
          value={filters.technology ?? ""}
          options={technologies.map((t) => ({ value: t, label: t }))}
          onChange={(technology) => setFilters((f) => ({ ...f, technology: technology || undefined }))}
        />
        <Select<Difficulty>
          label="Dificultad"
          value={filters.difficulty ?? ""}
          options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({
            value: d,
            label: DIFFICULTY_LABELS[d],
          }))}
          onChange={(difficulty) => setFilters((f) => ({ ...f, difficulty: difficulty || undefined }))}
        />
        <Select<InterviewType>
          label="Tipo de entrevista"
          value={filters.interviewType ?? ""}
          options={(Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]).map((t) => ({
            value: t,
            label: INTERVIEW_TYPE_LABELS[t],
          }))}
          onChange={(interviewType) =>
            setFilters((f) => ({ ...f, interviewType: interviewType || undefined }))
          }
        />
        <p className="text-muted ml-auto text-sm" aria-live="polite">
          {visible.length} de {challenges.length} · {solvedCount} resueltos
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted py-10 text-center text-sm">No hay challenges con esos filtros.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((challenge) => {
            const status = exerciseStatus(practice, challenge.id);
            const designDone = challenge.kind === "design" && practice.design[challenge.id];
            return (
              <li key={challenge.id}>
                <Link
                  href={`/challenges/${challenge.slug}`}
                  className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-foreground font-semibold">{challenge.title}</h2>
                    {status === "solved" || designDone ? (
                      <CheckCircle2 aria-label="Resuelto" className="text-success size-5 shrink-0" />
                    ) : status === "attempted" ? (
                      <CircleDot aria-label="Intentado" className="text-accent size-5 shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-muted flex-1 text-sm">{challenge.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="violet">{CHALLENGE_KIND_LABELS[challenge.kind]}</Badge>
                    <Badge tone={DIFFICULTY_TONES[challenge.difficulty]}>
                      {DIFFICULTY_LABELS[challenge.difficulty]}
                    </Badge>
                    <Badge>{INTERVIEW_TYPE_LABELS[challenge.interviewType]}</Badge>
                    <Badge>
                      <Clock aria-hidden className="size-3" /> {challenge.durationMinutes} min
                    </Badge>
                    {challenge.technologies.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
