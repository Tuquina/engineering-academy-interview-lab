"use client";

import { useSyncExternalStore } from "react";

const REFRESH_MS = 30_000;
let current = 0;

function subscribe(onChange: () => void): () => void {
  const interval = window.setInterval(() => {
    current = Date.now();
    onChange();
  }, REFRESH_MS);
  return () => window.clearInterval(interval);
}

function getSnapshot(): number {
  if (current === 0) current = Date.now();
  return current;
}

/**
 * Instante actual (en ms) que se refresca cada 30 s. Permite que tarjetas reprogramadas a minutos vuelvan a la cola
 * sin recargar la página. Devuelve `null` durante SSR e hidratación para no generar diferencias con el servidor.
 */
export function useNow(): Date | null {
  const timestamp = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  return timestamp === 0 ? null : new Date(timestamp);
}
