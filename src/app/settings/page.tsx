import type { Metadata } from "next";
import { SettingsPanel } from "@/modules/preferences/presentation/settings-panel";
import { DataBackupPanel } from "@/modules/sync/presentation/data-backup";

export const metadata: Metadata = { title: "Configuración" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted mt-1">Preferencias de estudio y datos guardados en este navegador.</p>
      </header>
      <SettingsPanel />
      <div className="mt-6">
        <DataBackupPanel />
      </div>
    </div>
  );
}
