import { CheckCircle2, ExternalLink, MessagesSquare, Target } from "lucide-react";
import type { InterviewQuestionRef, Reference } from "../../domain/catalog-types";
import { InlineCodeText } from "@/shared/ui/inline-code-text";

/**
 * Secciones fijas del modelo pedagógico (MASTER_PROMPT §9) que se generan a partir de los metadatos de la
 * lección. Mantenerlas como datos permite reutilizarlas fuera de la lección (Interview Arena, repasos).
 */

export const FIXED_SECTION_IDS = {
  objectives: "que-vas-a-aprender",
  interview: "preguntas-de-entrevista",
  summary: "resumen",
  references: "referencias",
} as const;

export function LearningObjectives({ objectives }: { objectives: readonly string[] }) {
  return (
    <section
      aria-labelledby={FIXED_SECTION_IDS.objectives}
      className="border-area/25 bg-area/5 rounded-xl border p-5"
    >
      <h2
        id={FIXED_SECTION_IDS.objectives}
        className="text-foreground mb-3 flex scroll-mt-20 items-center gap-2 text-base font-semibold"
      >
        <Target aria-hidden className="text-area size-4" /> ¿Qué vas a aprender?
      </h2>
      <ul className="flex flex-col gap-2 text-sm">
        {objectives.map((objective) => (
          <li key={objective} className="text-foreground/90 flex gap-2">
            <CheckCircle2 aria-hidden className="text-success mt-0.5 size-4 shrink-0" />
            <span>
              <InlineCodeText text={objective} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InterviewQuestions({ questions }: { questions: readonly InterviewQuestionRef[] }) {
  if (questions.length === 0) return null;
  return (
    <section aria-labelledby={FIXED_SECTION_IDS.interview}>
      <h2
        id={FIXED_SECTION_IDS.interview}
        className="text-foreground mb-2 flex scroll-mt-20 items-center gap-2 text-xl font-semibold"
      >
        <MessagesSquare aria-hidden className="text-violet size-5" /> Preguntas de entrevista
      </h2>
      <p className="text-muted mb-4 text-sm">
        Intentá responder en voz alta (1–2 minutos) antes de desplegar los puntos que una respuesta sólida
        debería cubrir.
      </p>
      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <details
            key={q.question}
            className="group border-border bg-surface open:border-violet/30 rounded-xl border transition-colors"
          >
            <summary className="text-foreground cursor-pointer list-none px-4 py-3 font-medium marker:hidden">
              <span className="text-violet mr-2 inline-block transition-transform group-open:rotate-90">
                ›
              </span>
              {q.question}
            </summary>
            <ul className="text-foreground/90 marker:text-muted list-disc px-4 pb-4 pl-10 text-sm">
              {q.keyPoints.map((point) => (
                <li key={point} className="mt-1">
                  {point}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LessonSummary({ points }: { points: readonly string[] }) {
  return (
    <section
      aria-labelledby={FIXED_SECTION_IDS.summary}
      className="border-success/30 bg-success/6 rounded-xl border p-5"
    >
      <h2 id={FIXED_SECTION_IDS.summary} className="text-foreground mb-3 scroll-mt-20 text-xl font-semibold">
        Resumen y puntos clave
      </h2>
      <ul className="text-foreground/90 marker:text-success flex list-disc flex-col gap-1.5 pl-5 text-sm">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

export function LessonReferences({ references }: { references: readonly Reference[] }) {
  if (references.length === 0) return null;
  return (
    <section aria-labelledby={FIXED_SECTION_IDS.references}>
      <h2
        id={FIXED_SECTION_IDS.references}
        className="text-foreground mb-3 scroll-mt-20 text-xl font-semibold"
      >
        Referencias
      </h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {references.map((reference) => (
          <li key={reference.url}>
            <a
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent inline-flex items-center gap-1.5 hover:underline"
            >
              {reference.title}
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
