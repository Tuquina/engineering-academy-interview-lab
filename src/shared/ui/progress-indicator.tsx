import { cn } from "@/shared/lib/cn";

interface ProgressIndicatorProps {
  /** Proporción en [0, 1]. Valores fuera de rango se acotan. */
  value: number;
  label: string;
  /**
   * Color de la barra: el acento, o el del área del contenedor (`area-tone-N`). Al llegar al 100 % la barra pasa
   * al color de éxito en ambos casos.
   */
  tone?: "accent" | "area";
  className?: string;
}

/** Barra de progreso accesible (rol `progressbar` con valores numéricos y etiqueta). */
export function ProgressIndicator({ value, label, tone = "accent", className }: ProgressIndicatorProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("bg-surface-3/70 h-2 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          percent === 100 ? "bg-success" : tone === "area" ? "bg-area" : "bg-accent",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
