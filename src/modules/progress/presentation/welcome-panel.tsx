"use client";

import { ArrowRight, Briefcase, Code2, MessagesSquare, Network } from "lucide-react";
import Link from "next/link";
import {
  usePreferences,
  usePreferencesActions,
} from "@/modules/preferences/presentation/preferences-context";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Button } from "@/shared/ui/button";
import type { LearnerData } from "./learner-data";

const HIGHLIGHTS = [
  { icon: Briefcase, text: "Rutas por puesto con cursos desde la introducción hasta nivel de entrevista." },
  {
    icon: Code2,
    text: "Live coding con problemas de algoritmos y prácticos, con tests reales en el navegador.",
  },
  { icon: Network, text: "System Design con casos clásicos y diagramas animados." },
  {
    icon: MessagesSquare,
    text: "Simulador de entrevistas técnicas y de comportamiento, con criterios y respuestas modelo.",
  },
];

/**
 * Bienvenida para quien todavía no eligió una ruta: explica qué es la academia y pide elegir el puesto al que
 * apunta. Elegir una ruta (o seguir con la sugerida) la guarda como ruta activa y el panel no vuelve a aparecer.
 */
export function WelcomePanel({ data }: { data: LearnerData }) {
  const isClient = useIsClient();
  const { activePathId } = usePreferences();
  const { update } = usePreferencesActions();
  // Las preferencias viven en este navegador: hasta hidratar no se sabe si ya eligió una ruta.
  if (!isClient || activePathId !== null) return null;

  return (
    <section
      aria-labelledby="bienvenida"
      className="border-accent/30 from-accent/10 rounded-lg border bg-gradient-to-br to-transparent p-6"
    >
      <h2 id="bienvenida" className="text-foreground text-2xl font-bold tracking-tight">
        Preparate para tu próxima búsqueda laboral
      </h2>
      <p className="text-muted mt-2 max-w-3xl">
        Engineering Academy es una academia para llegar preparado a las entrevistas técnicas: aprendés las
        tecnologías que piden las búsquedas, practicás con ejercicios reales y simulás entrevistas. Todo
        funciona sin cuenta; con una cuenta, tu progreso se sincroniza entre dispositivos.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
          <li key={text} className="text-foreground flex gap-2 text-sm">
            <Icon aria-hidden className="text-accent mt-0.5 size-4 shrink-0" />
            {text}
          </li>
        ))}
      </ul>

      <h3 className="text-foreground mt-6 mb-3 font-semibold">¿A qué puesto apuntás?</h3>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.paths.map((path) => (
          <li key={path.id}>
            <button
              type="button"
              onClick={() => update({ activePathId: path.id })}
              className="border-border bg-surface hover:border-accent/60 focus-visible:ring-accent flex h-full w-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="text-foreground font-semibold">{path.title}</span>
              <span className="text-muted flex-1 text-sm">{path.description}</span>
              <span className="text-accent flex items-center gap-1 text-sm font-medium">
                Elegir esta ruta <ArrowRight aria-hidden className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <Button variant="ghost" size="sm" onClick={() => update({ activePathId: data.defaultPathId })}>
          Ahora no, seguir con la ruta sugerida
        </Button>
        <Link href="/paths" className="text-accent hover:underline">
          Comparar las rutas en detalle
        </Link>
      </div>
    </section>
  );
}
