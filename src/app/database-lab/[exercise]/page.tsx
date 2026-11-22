import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSqlLab } from "@/infrastructure/composition/sql-lab";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { SqlExerciseWorkspace } from "@/modules/sql-lab/presentation/sql-exercise-workspace";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";

interface ExercisePageProps {
  params: Promise<{ exercise: string }>;
}

const toId = (slug: string) => `sql.${slug}`;

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getSqlLab()).exercises.map((e) => ({ exercise: e.id.replace(/^sql\./, "") }));
}

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const id = toId((await params).exercise);
  const exercise = (await getSqlLab()).exercises.find((e) => e.id === id);
  return exercise ? { title: `${exercise.title} · Database Lab` } : {};
}

export default async function SqlExercisePage({ params }: ExercisePageProps) {
  const lab = await getSqlLab();
  const exerciseId = toId((await params).exercise);
  const exercise = lab.exercises.find((e) => e.id === exerciseId);
  if (!exercise) notFound();

  const [statement, explanation] = await Promise.all([
    renderLessonBody(exercise.prompt),
    renderLessonBody(exercise.explanation),
  ]);

  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <header className="mb-4">
        <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
          <Link href="/database-lab" className="hover:text-foreground">
            Database Lab
          </Link>
        </nav>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{exercise.title}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={DIFFICULTY_TONES[exercise.difficulty]}>{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
          {exercise.topics.map((topic) => (
            <Badge key={topic}>{topic}</Badge>
          ))}
        </div>
      </header>
      <SqlExerciseWorkspace
        dataset={lab.dataset}
        exercise={exercise}
        attemptId={exercise.id}
        brief={{
          statement,
          solutionExplanation: explanation,
          constraints: [],
          acceptanceCriteria: [
            exercise.check.mode === "state"
              ? `Ejecutada ${exercise.check.runTimes} veces seguidas, la sentencia no falla y deja el estado esperado.`
              : `El resultado coincide con el esperado en columnas, filas y valores${exercise.check.orderMatters ? ", incluido el orden" : " (el orden no importa)"}.`,
          ],
          hints: exercise.hints,
          followUpQuestions: [],
        }}
      />
    </div>
  );
}
