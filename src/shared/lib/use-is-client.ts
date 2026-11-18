"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * `true` en el cliente después de la hidratación y `false` durante SSR. Útil para valores que dependen del reloj o
 * la zona horaria del usuario y no deben calcularse en el servidor.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
