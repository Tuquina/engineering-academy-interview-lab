import { AlertTriangle, Info, Lightbulb, MessagesSquare, OctagonX } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

const VARIANTS = {
  info: {
    icon: Info,
    label: "Nota",
    className: "border-info/35 bg-info/7 [&_.callout-icon]:text-info before:bg-info",
  },
  tip: {
    icon: Lightbulb,
    label: "Consejo",
    className: "border-success/35 bg-success/7 [&_.callout-icon]:text-success before:bg-success",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atención",
    className: "border-warning/35 bg-warning/7 [&_.callout-icon]:text-warning before:bg-warning",
  },
  danger: {
    icon: OctagonX,
    label: "Error frecuente",
    className: "border-danger/35 bg-danger/7 [&_.callout-icon]:text-danger before:bg-danger",
  },
  interview: {
    icon: MessagesSquare,
    label: "En la entrevista",
    className: "border-violet/35 bg-violet/7 [&_.callout-icon]:text-violet before:bg-violet",
  },
} as const;

export type CalloutType = keyof typeof VARIANTS;

/** Bloque destacado para notas, advertencias, errores frecuentes o consejos de entrevista. */
export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const variant = VARIANTS[type];
  const Icon = variant.icon;
  return (
    <aside
      className={cn(
        "not-prose relative my-7 overflow-hidden rounded-xl border py-4 pr-4 pl-5 text-[0.9375rem] leading-relaxed",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        variant.className,
      )}
    >
      <p className="text-foreground mb-2 flex items-center gap-2 font-semibold">
        <span className="callout-icon bg-surface/70 flex size-6 items-center justify-center rounded-md">
          <Icon aria-hidden className="size-4" />
        </span>
        {title ?? variant.label}
      </p>
      <div className="text-foreground/90 [&_code]:bg-surface-2 [&_code]:rounded [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_p+p]:mt-2">
        {children}
      </div>
    </aside>
  );
}
