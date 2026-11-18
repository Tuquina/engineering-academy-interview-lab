"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Indica si el foco está en un campo de texto: ahí los atajos de una tecla no deben actuar. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Atajos de navegación secuencial: `,` anterior y `.` siguiente. Se eligieron teclas que no requieren AltGr en
 * teclados en español y que no chocan con atajos del navegador.
 */
export function SequentialKeyboardNav({
  previousHref,
  nextHref,
}: {
  previousHref?: string;
  nextHref?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.key === "," && previousHref) router.push(previousHref);
      if (event.key === "." && nextHref) router.push(nextHref);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, previousHref, nextHref]);

  return null;
}
