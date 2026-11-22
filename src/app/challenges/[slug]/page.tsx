import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChallenges } from "@/infrastructure/composition/challenges";
import { getCatalog } from "@/infrastructure/composition/learning";
import { buildLessonIndex } from "@/infrastructure/composition/lesson-index";
import { getSqlLab } from "@/infrastructure/composition/sql-lab";
import { CHALLENGE_KIND_LABELS, INTERVIEW_TYPE_LABELS } from "@/modules/challenges/domain/challenge";
import type { ChallengeBriefContent } from "@/modules/challenges/presentation/challenge-brief";
import { CodeChallengeWorkspace } from "@/modules/challenges/presentation/code-challenge-workspace";
import { ReactChallengeWorkspaceClient } from "@/modules/challenges/presentation/react-challenge-workspace-client";
import { DesignChallengeWorkspace } from "@/modules/challenges/presentation/design-challenge-workspace";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { SqlExerciseWorkspace } from "@/modules/sql-lab/presentation/sql-exercise-workspace";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";

interface ChallengePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getChallenges()).map((challenge) => ({ slug: challenge.slug }));
}

export async function generateMetadata({ params }: ChallengePageProps): Promise<Metadata> {
  const { slug } = await params;
  const challenge = (await getChallenges()).find((c) => c.slug === slug);
  return challenge ? { title: challenge.title, description: challenge.summary } : {};
}

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { slug } = await params;
  const [challenges, catalog] = await Promise.all([getChallenges(), getCatalog()]);
  const challenge = challenges.find((c) => c.slug === slug);
  if (!challenge) notFound();

  const lessons = buildLessonIndex(catalog);
  const related = challenge.relatedLessons.map((id) => lessons[id]).filter((l) => l !== undefined);
  const [statement, solutionExplanation] = await Promise.all([
    renderLessonBody(challenge.statement),
    renderLessonBody(challenge.solutionExplanation),
  ]);
  const briefProps: ChallengeBriefContent = {
    statement,
    solutionExplanation,
    constraints: challenge.constraints,
    acceptanceCriteria: challenge.acceptanceCriteria,
    hints: challenge.hints,
    followUpQuestions: challenge.followUpQuestions,
  };

  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <header className="mb-4">
        <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
          <Link href="/challenges" className="hover:text-foreground">
            Challenges
          </Link>
        </nav>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{challenge.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="violet">{CHALLENGE_KIND_LABELS[challenge.kind]}</Badge>
          <Badge tone={DIFFICULTY_TONES[challenge.difficulty]}>
            {DIFFICULTY_LABELS[challenge.difficulty]}
          </Badge>
          <Badge>{INTERVIEW_TYPE_LABELS[challenge.interviewType]}</Badge>
          <Badge>
            <Clock aria-hidden className="size-3" /> {challenge.durationMinutes} min
          </Badge>
          {related.map((lesson) => (
            <Link key={lesson.id} href={lesson.href} className="text-accent ml-2 text-xs hover:underline">
              Lección: {lesson.title}
            </Link>
          ))}
        </div>
      </header>

      {challenge.kind === "code" && (
        <CodeChallengeWorkspace
          id={challenge.id}
          slug={challenge.slug}
          starter={challenge.files.starter}
          tests={challenge.files.tests}
          hiddenTests={challenge.files.hiddenTests}
          referenceSolution={challenge.files.solution}
          {...briefProps}
        />
      )}
      {challenge.kind === "react" && (
        <ReactChallengeWorkspaceClient
          id={challenge.id}
          starter={challenge.files.starter}
          tests={challenge.files.tests}
          referenceSolution={challenge.files.solution}
          {...briefProps}
        />
      )}
      {challenge.kind === "sql" && (
        <SqlChallengeSection
          exerciseId={challenge.sqlExerciseId}
          challengeId={challenge.id}
          briefProps={briefProps}
        />
      )}
      {challenge.kind === "design" && (
        <DesignChallengeWorkspace id={challenge.id} rubric={challenge.rubric} {...briefProps} />
      )}
    </div>
  );
}

async function SqlChallengeSection({
  exerciseId,
  challengeId,
  briefProps,
}: {
  exerciseId: string;
  challengeId: string;
  briefProps: ChallengeBriefContent;
}) {
  const lab = await getSqlLab();
  const exercise = lab.exercises.find((e) => e.id === exerciseId);
  if (!exercise)
    throw new Error(`El challenge ${challengeId} referencia el ejercicio SQL inexistente ${exerciseId}.`);
  return (
    <SqlExerciseWorkspace
      dataset={lab.dataset}
      exercise={exercise}
      attemptId={challengeId}
      brief={briefProps}
    />
  );
}
