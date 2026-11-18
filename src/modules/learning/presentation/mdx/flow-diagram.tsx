import { ArrowDown, ArrowRight } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/shared/lib/cn";

export interface FlowStep {
  title: string;
  detail: string;
  /** Resalta etapas especiales: `boundary` para límites de confianza, `runtime` para lo que existe al ejecutar. */
  tone?: "default" | "boundary" | "runtime";
}

const TONES = {
  default: "border-border bg-surface",
  boundary: "border-warning/50 bg-warning/8",
  runtime: "border-accent/50 bg-accent/8",
} as const;

/**
 * Diagrama de flujo lineal y accesible: semánticamente es una lista ordenada, por lo que los lectores de
 * pantalla lo recorren como una secuencia. En pantallas muy anchas se dispone en horizontal.
 */
export function FlowDiagram({ steps, caption }: { steps: FlowStep[]; caption?: string }) {
  return (
    <figure className="not-prose my-8">
      <ol className="flex flex-col items-stretch gap-2 xl:flex-row xl:items-center">
        {steps.map((step, index) => (
          <Fragment key={step.title}>
            <li className={cn("flex-1 rounded-lg border p-3 text-sm", TONES[step.tone ?? "default"])}>
              <span className="text-muted mb-1 block text-xs font-medium">Paso {index + 1}</span>
              <span className="text-foreground block font-semibold">{step.title}</span>
              <span className="text-muted mt-1 block">{step.detail}</span>
            </li>
            {index < steps.length - 1 && (
              <li aria-hidden className="text-muted flex justify-center">
                <ArrowDown className="size-4 xl:hidden" />
                <ArrowRight className="hidden size-4 xl:block" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
      {caption && <figcaption className="text-muted mt-3 text-center text-xs">{caption}</figcaption>}
    </figure>
  );
}
