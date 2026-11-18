import { cn } from "@/shared/lib/cn";

interface ProgressIndicatorProps {
  /** Proporción en [0, 1]. Valores fuera de rango se acotan. */
  value: number;
  label: string;
  className?: string;
}

/** Barra de progreso accesible (rol `progressbar` con valores numéricos y etiqueta). */
export function ProgressIndicator({ value, label, className }: ProgressIndicatorProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("bg-surface-2 h-2 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className="bg-accent h-full rounded-full transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
