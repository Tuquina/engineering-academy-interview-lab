"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionUser } from "../domain/user";

export interface AuthCapabilities {
  readonly persistence: boolean;
  readonly github: boolean;
  readonly signupOpen: boolean;
}

export interface SessionState {
  readonly status: "loading" | "guest" | "authenticated";
  readonly user: SessionUser | null;
  readonly capabilities: AuthCapabilities;
}

interface SessionContextValue extends SessionState {
  refresh(): Promise<SessionState>;
  logout(): Promise<void>;
  /** Tareas a completar antes de cerrar la sesión (por ejemplo, subir cambios pendientes). */
  onBeforeLogout(task: () => Promise<void>): () => void;
}

const NO_CAPABILITIES: AuthCapabilities = { persistence: false, github: false, signupOpen: false };
const LOADING: SessionState = { status: "loading", user: null, capabilities: NO_CAPABILITIES };

const SessionContext = createContext<SessionContextValue | null>(null);

async function fetchSession(): Promise<SessionState> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) return { status: "guest", user: null, capabilities: NO_CAPABILITIES };
    const data = (await response.json()) as { user: SessionUser | null; capabilities: AuthCapabilities };
    return {
      status: data.user ? "authenticated" : "guest",
      user: data.user,
      capabilities: data.capabilities,
    };
  } catch {
    return { status: "guest", user: null, capabilities: NO_CAPABILITIES };
  }
}

/**
 * Sesión del usuario en el cliente. La consulta al servidor es la fuente de verdad: la cookie es `HttpOnly` y el
 * navegador no puede leerla. Esto sólo decide qué mostrar; los permisos se verifican en cada endpoint.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(LOADING);

  const refresh = useCallback(async () => {
    const next = await fetchSession();
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void fetchSession().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const [beforeLogout] = useState(() => new Set<() => Promise<void>>());
  const onBeforeLogout = useCallback(
    (task: () => Promise<void>) => {
      beforeLogout.add(task);
      return () => void beforeLogout.delete(task);
    },
    [beforeLogout],
  );

  const logout = useCallback(async () => {
    await Promise.allSettled([...beforeLogout].map((task) => task()));
    await fetch("/api/auth/logout", { method: "POST" });
    window.dispatchEvent(new CustomEvent("eal:logout"));
    await refresh();
  }, [refresh, beforeLogout]);

  const value = useMemo(
    () => ({ ...state, refresh, logout, onBeforeLogout }),
    [state, refresh, logout, onBeforeLogout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session: falta el SessionProvider.");
  return value;
}
