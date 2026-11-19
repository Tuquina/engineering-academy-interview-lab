import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EvalPlayground } from "@/modules/agent-lab/presentation/eval-playground";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";

export const metadata: Metadata = { title: "Eval Playground" };

const CONCEPTS = [
  ["Test case y golden dataset", "Casos con resultado esperado conocido (ground truth) sobre datos fijos."],
  ["Suite de regresión", "Se vuelve a ejecutar con cada cambio de prompt, herramientas, políticas o modelo."],
  [
    "Determinista vs. probabilística",
    "Herramientas y estado se verifican exacto; el texto, por conceptos o con un juez.",
  ],
  [
    "Pruebas repetidas",
    "Un agente no determinista se mide como proporción: 4 de 5, con su intervalo de confianza.",
  ],
  [
    "Falsos positivos",
    "Una diferencia entre versiones cuenta sólo si supera la variabilidad (intervalos que no se tocan).",
  ],
  ["Quality gate", "Criterios de aceptación que bloquean publicar una versión que no los cumple."],
] as const;

export default function EvalsPage() {
  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/agents" className="hover:text-foreground">
          AI Agents Lab
        </Link>
      </nav>
      <header className="mb-5">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Eval Playground</h1>
        <p className="text-muted mt-1 max-w-3xl">
          Compará dos versiones de un agente sobre la misma suite, con repeticiones reproducibles. Nada se
          evalúa por coincidencia literal de texto: se miran herramientas, estado del negocio y conceptos.
        </p>
      </header>
      <dl className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONCEPTS.map(([term, text]) => (
          <div key={term} className="border-border bg-surface rounded-lg border p-3">
            <dt className="text-foreground text-sm font-semibold">{term}</dt>
            <dd className="text-muted text-xs">{text}</dd>
          </div>
        ))}
      </dl>
      <Suspense fallback={<p className="text-muted text-sm">Cargando…</p>}>
        <EvalPlayground />
      </Suspense>
    </div>
  );
}
