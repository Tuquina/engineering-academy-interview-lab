"use client";

import { useEffect } from "react";
import { useProgressActions } from "./progress-context";

/** Intervalo de muestreo del tiempo activo. */
const TICK_SECONDS = 15;
/** Sin interacción durante este lapso, se considera que el usuario dejó de estudiar. */
const IDLE_AFTER_MS = 2 * 60_000;

/**
 * Mide tiempo de estudio **activo** de forma aproximada: suma un intervalo sólo si la pestaña está visible y hubo
 * interacción reciente (scroll, teclado, puntero o toque). No mide lectura sin interacción más allá de 2 minutos:
 * es una estimación conservadora, y así se presenta en las estadísticas.
 */
export function StudyTimer() {
  const { addStudySeconds } = useProgressActions();

  useEffect(() => {
    let lastInteraction = Date.now();
    const markActive = () => {
      lastInteraction = Date.now();
    };
    const events = ["pointermove", "pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const interval = window.setInterval(() => {
      const visible = document.visibilityState === "visible";
      if (visible && Date.now() - lastInteraction < IDLE_AFTER_MS) addStudySeconds(TICK_SECONDS);
    }, TICK_SECONDS * 1000);

    return () => {
      window.clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, [addStudySeconds]);

  return null;
}
