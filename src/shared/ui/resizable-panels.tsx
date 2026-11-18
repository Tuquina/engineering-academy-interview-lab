"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Dos paneles lado a lado con un divisor arrastrable (y operable con teclado: flechas, Home, End).
 * En pantallas angostas los paneles se apilan y el divisor se oculta.
 */
export function ResizablePanels({
  left,
  right,
  initialLeftPercent = 45,
  minPercent = 25,
  label = "Redimensionar paneles",
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  initialLeftPercent?: number;
  minPercent?: number;
  label?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(initialLeftPercent);
  const clamp = useCallback(
    (value: number) => Math.min(100 - minPercent, Math.max(minPercent, value)),
    [minPercent],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLeftPercent(clamp(((event.clientX - rect.left) / rect.width) * 100));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const next =
      event.key === "ArrowLeft"
        ? leftPercent - step
        : event.key === "ArrowRight"
          ? leftPercent + step
          : event.key === "Home"
            ? minPercent
            : event.key === "End"
              ? 100 - minPercent
              : null;
    if (next === null) return;
    event.preventDefault();
    setLeftPercent(clamp(next));
  };

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-0 flex-col gap-4 lg:flex-row lg:gap-0", className)}
      style={{ "--left": `${leftPercent}%` } as React.CSSProperties}
    >
      <div className="min-h-0 min-w-0 lg:w-[var(--left)] lg:shrink-0 lg:pr-2">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={minPercent}
        aria-valuemax={100 - minPercent}
        aria-valuenow={Math.round(leftPercent)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="group hover:bg-accent/20 focus-visible:bg-accent/30 hidden w-2 shrink-0 cursor-col-resize items-center justify-center rounded transition-colors lg:flex"
      >
        <span className="bg-border group-hover:bg-accent h-10 w-0.5 rounded" />
      </div>
      <div className="min-h-0 min-w-0 flex-1 lg:pl-2">{right}</div>
    </div>
  );
}
