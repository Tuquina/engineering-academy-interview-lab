"use client";

import { CloudCheck, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { DataBackupPanel } from "./data-backup";
import { useSyncController, useSyncStatus } from "./sync-context";

/** Estado de la sincronización de la cuenta y copia de seguridad (página Mi cuenta). */
export function SyncPanel() {
  const controller = useSyncController();
  const status = useSyncStatus();
  const isClient = useIsClient();
  return (
    <>
      <Card data-testid="sync-panel">
        <CardTitle className="flex items-center gap-2">
          {status.phase === "syncing" ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : status.phase === "error" ? (
            <CloudOff aria-hidden className="text-danger size-4" />
          ) : (
            <CloudCheck aria-hidden className="text-success size-4" />
          )}
          Sincronización
        </CardTitle>
        <CardDescription>
          Progreso, respuestas, notas, flashcards, preferencias, challenges, System Design Studio, Interview
          Arena y AI Agents Lab se guardan en tu cuenta. Este navegador conserva una copia para funcionar sin
          conexión; al cerrar sesión se borra.
        </CardDescription>
        <p className="text-foreground mt-3 text-sm" role="status" data-testid="sync-status">
          {status.phase === "syncing"
            ? "Sincronizando…"
            : status.phase === "error"
              ? `Error: ${status.error}`
              : status.phase === "synced"
                ? `Sincronizado${isClient && status.lastSyncedAt ? ` a las ${new Date(status.lastSyncedAt).toLocaleTimeString("es-AR")}` : ""}.`
                : "Esperando la sesión…"}
        </p>
        <Button
          variant="secondary"
          className="mt-3"
          disabled={!controller || status.phase === "syncing"}
          onClick={() => void controller?.refresh()}
        >
          <RefreshCw aria-hidden /> Sincronizar ahora
        </Button>
      </Card>
      <DataBackupPanel />
    </>
  );
}
