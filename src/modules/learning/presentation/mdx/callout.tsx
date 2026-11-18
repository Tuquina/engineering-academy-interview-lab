import { AlertTriangle, Info, Lightbulb, MessagesSquare, OctagonX } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

const VARIANTS = {
  info: {
    icon: Info,
    label: "Nota",
    className: "border-accent/40 bg-accent/8 [&_.callout-icon]:text-accent",
  },
  tip: {
    icon: Lightbulb,
    label: "Consejo",
    className: "border-success/40 bg-success/8 [&_.callout-icon]:text-success",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atención",
    className: "border-warning/40 bg-warning/8 [&_.callout-icon]:text-warning",
  },
  danger: {
    icon: OctagonX,
    label: "Error frecuente",
    className: "border-danger/40 bg-danger/8 [&_.callout-icon]:text-danger",
  },
  interview: {
    icon: MessagesSquare,
    label: "En la entrevista",
    className: "border-violet/40 bg-violet/8 [&_.callout-icon]:text-violet",
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
    <aside className={cn("not-prose my-6 rounded-lg border p-4 text-sm leading-relaxed", variant.className)}>
      <p className="text-foreground mb-1.5 flex items-center gap-2 font-semibold">
        <Icon aria-hidden className="callout-icon size-4" />
        {title ?? variant.label}
      </p>
      <div className="text-foreground/90 [&_code]:bg-surface-2 [&_code]:rounded [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_p+p]:mt-2">
        {children}
      </div>
    </aside>
  );
}
