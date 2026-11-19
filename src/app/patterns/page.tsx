import { Columns2, Network } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getArchitectureContent, toPatternSummary } from "@/infrastructure/composition/architecture";
import { PatternCatalog } from "@/modules/architecture/presentation/pattern-catalog";

export const metadata: Metadata = { title: "Patrones y arquitectura" };

export default async function PatternsPage() {
  const { patterns, diagrams, profiles } = await getArchitectureContent();
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Patrones y arquitectura</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Cada patrón explica el problema que resuelve, cuándo conviene y cuándo no, con un ejemplo
          incorrecto, una implementación en TypeScript, un ejercicio y preguntas de entrevista. Ningún patrón
          es una receta universal: el objetivo es saber justificar cuándo usarlo.
        </p>
      </header>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/patterns/diagrams"
          className="border-border bg-surface hover:border-accent/50 flex gap-4 rounded-lg border p-5 transition-colors"
        >
          <Network aria-hidden className="text-accent size-6 shrink-0" />
          <span>
            <span className="text-foreground block font-semibold">Diagramas interactivos</span>
            <span className="text-muted text-sm">
              {diagrams.length} arquitecturas para inspeccionar elemento por elemento y recorrer paso a paso.
            </span>
          </span>
        </Link>
        <Link
          href="/patterns/compare"
          className="border-border bg-surface hover:border-accent/50 flex gap-4 rounded-lg border p-5 transition-colors"
        >
          <Columns2 aria-hidden className="text-accent size-6 shrink-0" />
          <span>
            <span className="text-foreground block font-semibold">Comparador de arquitecturas</span>
            <span className="text-muted text-sm">
              {profiles.length} estilos comparados en 10 dimensiones, con los compromisos explicados.
            </span>
          </span>
        </Link>
      </div>
      <PatternCatalog patterns={patterns.map(toPatternSummary)} />
    </div>
  );
}
