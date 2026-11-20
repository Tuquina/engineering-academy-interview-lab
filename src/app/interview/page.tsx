import {
  Bot,
  Clock,
  Code2,
  Layers,
  MessagesSquare,
  Network,
  RotateCcw,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getInterviewQuestions, toQuestionData } from "@/infrastructure/composition/interviews";
import { AREA_LABELS, INTERVIEW_AREAS } from "@/modules/interviews/domain/question";
import { INTERVIEW_MODES, MODE_INFO, type InterviewMode } from "@/modules/interviews/domain/session";
import { InterviewHistory } from "@/modules/interviews/presentation/interview-history";

export const metadata: Metadata = { title: "Interview Arena" };

const MODE_ICONS: Record<InterviewMode, LucideIcon> = {
  quick: Zap,
  "deep-dive": Layers,
  "live-coding": Code2,
  "system-design": Network,
  "ai-engineering": Bot,
  behavioral: UserRound,
  mock: MessagesSquare,
  review: RotateCcw,
};

export default async function InterviewArenaPage() {
  const questions = await getInterviewQuestions();
  const counts = INTERVIEW_AREAS.map((area) => ({
    area,
    count: questions.filter((q) => q.area === area).length,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Interview Arena</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Simulá entrevistas técnicas con tiempo. Después de cada respuesta ves los criterios esperados, te
          autoevaluás, y recibís una respuesta sólida de referencia con seguimiento. No hay evaluación
          automática con IA: el puntaje es tu propia autoevaluación contra criterios explícitos.
        </p>
        <p className="text-muted mt-2 text-sm">
          Banco: {questions.length} preguntas ·{" "}
          {counts
            .filter((c) => c.count > 0)
            .map((c) => `${AREA_LABELS[c.area]} ${c.count}`)
            .join(" · ")}
        </p>
      </header>

      <ul className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTERVIEW_MODES.map((mode) => {
          const Icon = MODE_ICONS[mode];
          return (
            <li key={mode}>
              <Link
                href={`/interview/${mode}`}
                className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-2 rounded-lg border p-5 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Icon aria-hidden className="text-accent size-5" />
                  <span className="text-foreground font-semibold">{MODE_INFO[mode].title}</span>
                </span>
                <span className="text-muted flex-1 text-sm">{MODE_INFO[mode].description}</span>
                <span className="text-muted flex items-center gap-1 text-xs">
                  <Clock aria-hidden className="size-3" />
                  {mode === "mock"
                    ? "20 a 75 min según las secciones"
                    : `${MODE_INFO[mode].minMinutes}–${MODE_INFO[mode].maxMinutes} min`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <InterviewHistory questions={questions.map(toQuestionData)} />
    </div>
  );
}
