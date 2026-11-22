import { Clock, PenTool } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getArchitectureChallenges, getCaseStudies } from "@/infrastructure/composition/system-design";
import { DIFFICULTY_LABELS } from "@/modules/learning/domain/catalog-types";
import { SIMULATIONS } from "@/modules/system-design/domain/simulations/catalog";
import { Badge, DIFFICULTY_TONES } from "@/shared/ui/badge";

export const metadata: Metadata = { title: "System Design Studio" };

export default async function SystemDesignPage() {
  const [challenges, cases] = await Promise.all([getArchitectureChallenges(), getCaseStudies()]);
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">System Design Studio</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Aprendé con casos clásicos resueltos y diagramas animados, practicá con un canvas de arquitectura,
          simuladores de comportamientos distribuidos y desafíos con requerimientos, preguntas aclaratorias,
          checklist y rúbrica.
        </p>
      </header>

      <section aria-labelledby="casos" className="mb-10">
        <h2 id="casos" className="text-foreground mb-1 text-xl font-semibold tracking-tight">
          Casos clásicos de entrevista
        </h2>
        <p className="text-muted mb-3 text-sm">
          Problemas que se repiten en entrevistas reales, resueltos de punta a punta: requerimientos,
          estimaciones, un diagrama interactivo con el recorrido animado de cada flujo, profundizaciones y
          compromisos.
        </p>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cases.map((study) => (
            <li key={study.id}>
              <Link
                href={`/system-design/cases/${study.slug}`}
                className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors"
              >
                <h3 className="text-foreground font-semibold">{study.title}</h3>
                <p className="text-muted flex-1 text-sm">{study.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={DIFFICULTY_TONES[study.difficulty]}>
                    {DIFFICULTY_LABELS[study.difficulty]}
                  </Badge>
                  {study.tags.slice(0, 3).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/system-design/canvas"
        className="border-border bg-surface hover:border-accent/50 mb-10 flex gap-4 rounded-lg border p-5 transition-colors"
      >
        <PenTool aria-hidden className="text-accent size-6 shrink-0" />
        <span>
          <span className="text-foreground block font-semibold">Architecture Canvas</span>
          <span className="text-muted text-sm">
            Armá diagramas con 14 tipos de componentes, conectalos, describí sus propiedades y exportalos como
            imagen o JSON.
          </span>
        </span>
      </Link>

      <section aria-labelledby="desafios" className="mb-10">
        <h2 id="desafios" className="text-foreground mb-3 text-xl font-semibold tracking-tight">
          Desafíos de arquitectura
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <Link
                href={`/system-design/challenges/${challenge.slug}`}
                className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors"
              >
                <h3 className="text-foreground font-semibold">{challenge.title}</h3>
                <p className="text-muted flex-1 text-sm">{challenge.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={DIFFICULTY_TONES[challenge.difficulty]}>
                    {DIFFICULTY_LABELS[challenge.difficulty]}
                  </Badge>
                  <Badge>
                    <Clock aria-hidden className="size-3" /> {challenge.durationMinutes} min
                  </Badge>
                  {challenge.topics.slice(0, 3).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="simuladores">
        <h2 id="simuladores" className="text-foreground mb-1 text-xl font-semibold tracking-tight">
          Simuladores
        </h2>
        <p className="text-muted mb-3 text-sm">
          Modelos simplificados y deterministas, con línea temporal y métricas. Cada uno aclara qué simplifica
          y cómo se observa el comportamiento en infraestructura real.
        </p>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SIMULATIONS.map((simulation) => (
            <li key={simulation.slug}>
              <Link
                href={`/system-design/simulators/${simulation.slug}`}
                className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors"
              >
                <h3 className="text-foreground font-semibold">{simulation.title}</h3>
                <p className="text-muted flex-1 text-sm">{simulation.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {simulation.topics.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
