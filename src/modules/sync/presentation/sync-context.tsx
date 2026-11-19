"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useSession } from "@/modules/auth/presentation/session-context";
import type { SyncController } from "../application/sync-engine";

const SyncContext = createContext<SyncController | null>(null);

const GUEST_STATUS = { phase: "guest", userId: null, lastSyncedAt: null, error: null } as const;

/**
 * Conecta la sesión con la sincronización: con sesión iniciada replica los stores en la cuenta; al cerrar sesión sube
 * lo pendiente y borra de este navegador los datos de la cuenta (nunca quedan a la vista de la próxima persona).
 */
export function SyncProvider({
  controller,
  children,
}: {
  controller: SyncController | null;
  children: ReactNode;
}) {
  const session = useSession();
  const userId = session.status === "authenticated" ? (session.user?.id ?? null) : null;
  const { status, onBeforeLogout } = session;

  useEffect(() => {
    if (!controller || status === "loading") return;
    if (userId) {
      void controller.attach(userId);
    } else {
      // Sin sesión (cierre o vencimiento): se borran de este navegador los datos que eran de una cuenta.
      controller.detach(true);
    }
  }, [controller, status, userId]);

  useEffect(() => {
    if (!controller) return;
    const unregister = onBeforeLogout(() => controller.flush());
    const onVisible = () => {
      if (document.visibilityState === "visible") void controller.refresh();
      else void controller.flush();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unregister();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [controller, onBeforeLogout]);

  return <SyncContext.Provider value={controller}>{children}</SyncContext.Provider>;
}

const noopSubscribe = () => () => undefined;

export function useSyncController(): SyncController | null {
  return useContext(SyncContext);
}

export function useSyncStatus() {
  const controller = useSyncController();
  return useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    () => controller?.getSnapshot() ?? GUEST_STATUS,
    () => GUEST_STATUS,
  );
}
