import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("border-border bg-surface min-w-0 rounded-xl border p-5 shadow-xs", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-foreground text-base font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-muted text-sm", className)} {...props} />;
}

/**
 * Estilos de una tarjeta que es en sí misma un enlace: elevación y borde de color al pasar el mouse, y anillo de foco
 * visible con teclado. Dentro de un `area-tone-N` el borde toma el color del área.
 */
export const interactiveCardClass =
  "border-border bg-surface rounded-xl border shadow-xs transition-[border-color,box-shadow,transform] " +
  "hover:border-area/50 hover:shadow-md motion-safe:hover:-translate-y-0.5 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
