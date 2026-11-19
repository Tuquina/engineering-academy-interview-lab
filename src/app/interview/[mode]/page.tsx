import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getChallenges } from "@/infrastructure/composition/challenges";
import { getInterviewQuestions, toQuestionData } from "@/infrastructure/composition/interviews";
import { getCatalog } from "@/infrastructure/composition/learning";
import { buildLessonIndex } from "@/infrastructure/composition/lesson-index";
import { getArchitectureChallenges } from "@/infrastructure/composition/system-design";
import { INTERVIEW_MODES, MODE_INFO, type InterviewMode } from "@/modules/interviews/domain/session";
import {
  InterviewSession,
  type SystemDesignChallengeContent,
} from "@/modules/interviews/presentation/interview-session";
import type { LiveCodingChallenge } from "@/modules/interviews/presentation/live-coding-step";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";

interface ModePageProps {
  params: Promise<{ mode: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return INTERVIEW_MODES.map((mode) => ({ mode }));
}

const isMode = (value: string): value is InterviewMode =>
  (INTERVIEW_MODES as readonly string[]).includes(value);

export async function generateMetadata({ params }: ModePageProps): Promise<Metadata> {
  const { mode } = await params;
  return isMode(mode) ? { title: MODE_INFO[mode].title, description: MODE_INFO[mode].description } : {};
}

const usesQuestions = (mode: InterviewMode) => !["system-design", "live-coding"].includes(mode);
const usesSystemDesign = (mode: InterviewMode) => mode === "system-design" || mode === "mock";
const usesLiveCoding = (mode: InterviewMode) => mode === "live-coding" || mode === "mock";

/** Cada modo carga sólo el contenido que necesita; las respuestas de referencia se renderizan en el servidor. */
export default async function InterviewModePage({ params }: ModePageProps) {
  const { mode } = await params;
  if (!isMode(mode)) notFound();

  const [questions, catalog] = await Promise.all([getInterviewQuestions(), getCatalog()]);
  const lessonIndex = buildLessonIndex(catalog);
  const lessons = Object.fromEntries(
    Object.entries(lessonIndex).map(([id, lesson]) => [id, { title: lesson.title, href: lesson.href }]),
  );

  const strongAnswers: Record<string, ReactNode> = {};
  if (usesQuestions(mode)) {
    await Promise.all(
      questions.map(async (q) => {
        strongAnswers[q.id] = await renderLessonBody(q.strongAnswer);
      }),
    );
  }

  const systemDesign: SystemDesignChallengeContent[] = usesSystemDesign(mode)
    ? await Promise.all(
        (await getArchitectureChallenges()).map(async ({ context, solution, ...data }) => ({
          data,
          context: await renderLessonBody(context),
          solution: await renderLessonBody(solution),
        })),
      )
    : [];

  const codeChallenges: LiveCodingChallenge[] = usesLiveCoding(mode)
    ? await Promise.all(
        (await getChallenges())
          .filter((c) => c.kind === "code")
          .map(async (c) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            starter: c.files.starter,
            tests: c.files.tests,
            hiddenTests: c.files.hiddenTests,
            referenceSolution: c.files.solution,
            statement: await renderLessonBody(c.statement),
            solutionExplanation: await renderLessonBody(c.solutionExplanation),
            constraints: c.constraints,
            acceptanceCriteria: c.acceptanceCriteria,
            hints: c.hints,
            followUpQuestions: c.followUpQuestions,
          })),
      )
    : [];

  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/interview" className="hover:text-foreground">
          Interview Arena
        </Link>
      </nav>
      <header className="mb-5">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{MODE_INFO[mode].title}</h1>
        <p className="text-muted mt-1">{MODE_INFO[mode].description}</p>
      </header>
      <InterviewSession
        mode={mode}
        questions={questions.map(toQuestionData)}
        strongAnswers={strongAnswers}
        lessons={lessons}
        systemDesign={systemDesign}
        codeChallenges={codeChallenges}
      />
    </div>
  );
}
