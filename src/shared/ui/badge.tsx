import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-muted",
      accent: "bg-accent/12 text-accent",
      violet: "bg-violet/12 text-violet",
      success: "bg-success/12 text-success",
      warning: "bg-warning/12 text-warning",
      danger: "bg-danger/12 text-danger",
      info: "bg-info/12 text-info",
      /** Color del área del contenedor más cercano con `area-tone-N`. */
      area: "bg-area/12 text-area",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Tono de badge según la dificultad: los niveles se distinguen por color además de por texto. */
export const DIFFICULTY_TONES = {
  basic: "success",
  intermediate: "info",
  advanced: "warning",
} as const;
