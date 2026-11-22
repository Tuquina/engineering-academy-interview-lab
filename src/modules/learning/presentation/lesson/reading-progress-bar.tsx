"use client";

import { useEffect, useRef } from "react";

/**
 * Barra fina bajo el encabezado que muestra cuánto de la lección se recorrió. Es una ayuda visual (el progreso real
 * se registra aparte), por eso se oculta a lectores de pantalla. Actualiza el ancho directamente en el DOM para no
 * re-renderizar en cada evento de scroll.
 */
export function ReadingProgressBar({ targetId }: { targetId: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const target = document.getElementById(targetId);
      const bar = barRef.current;
      if (!target || !bar) return;
      const rect = target.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const ratio = scrollable <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / scrollable));
      bar.style.transform = `scaleX(${ratio})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [targetId]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-14 z-30 h-0.5 lg:left-64">
      <div ref={barRef} className="bg-area h-full origin-left" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
