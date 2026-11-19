import { Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArchitectureChallenges } from "@/infrastructure/composition/system-design";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { renderLessonBody } from "@/modules/learning/presentation/mdx/render-lesson-body";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { ArchitectureChallengeWorkspace } from "@/modules/system-design/presentation/architecture-challenge-workspace";
import { Badge } from "@/shared/ui/badge";

interface ChallengePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getArchitectureChallenges()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: ChallengePageProps): Promise<Metadata> {
  const { slug } = await params;
  const challenge = (await getArchitectureChallenges()).find((c) => c.slug === slug);
  return challenge ? { title: challenge.title, description: challenge.summary } : {};
}

export default async function ArchitectureChallengePage({ params }: ChallengePageProps) {
  const { slug } = await params;
  const challenge = (await getArchitectureChallenges()).find((c) => c.slug === slug);
  if (!challenge) notFound();
  const { context, solution, ...data } = challenge;
  const [contextBody, solutionBody] = await Promise.all([
    renderLessonBody(context),
    renderLessonBody(solution),
  ]);

  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/system-design" className="hover:text-foreground">
          System Design Studio
        </Link>
      </nav>
      <header className="mb-5">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{challenge.title}</h1>
        <p className="text-muted mt-1">{challenge.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="violet">Desafío de arquitectura</Badge>
          <Badge tone="accent">{DIFFICULTY_LABELS[challenge.difficulty]}</Badge>
          <Badge>
            <Clock aria-hidden className="size-3" /> {challenge.durationMinutes} min
          </Badge>
        </div>
      </header>
      <ArchitectureChallengeWorkspace challenge={data} context={contextBody} solution={solutionBody} />
    </div>
  );
}
