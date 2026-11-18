"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { ExternalStore } from "@/shared/kernel/external-store";

/**
 * Crea un contexto de React tipado para un {@link ExternalStore}.
 *
 * Durante SSR e hidratación devuelve `empty` (el servidor no conoce el estado local del usuario), evitando
 * diferencias de hidratación; después refleja el estado persistido.
 */
export function createStoreContext<T>(name: string, empty: T) {
  const Context = createContext<ExternalStore<T> | null>(null);
  const getServerSnapshot = (): T => empty;

  function Provider({ store, children }: { store: ExternalStore<T>; children: ReactNode }) {
    return <Context.Provider value={store}>{children}</Context.Provider>;
  }

  function useStore(): ExternalStore<T> {
    const store = useContext(Context);
    if (!store) throw new Error(`${name}: falta el Provider correspondiente.`);
    return store;
  }

  function useStoreState(): T {
    const store = useStore();
    return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
  }

  return { Provider, useStore, useStoreState };
}
