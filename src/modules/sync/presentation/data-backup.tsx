"use client";

import { Download, Upload } from "lucide-react";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { BACKUP_STORE_LABELS, type UserDataBackupPort } from "../application/user-data-backup";

const BackupContext = createContext<UserDataBackupPort | null>(null);

export function BackupProvider({ port, children }: { port: UserDataBackupPort | null; children: ReactNode }) {
  return <BackupContext.Provider value={port}>{children}</BackupContext.Provider>;
}

/** Exportar e importar todos los datos del usuario como JSON (MASTER_PROMPT §8.4 y §36: importación/exportación). */
export function DataBackupPanel() {
  const port = useContext(BackupContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  if (!port) return null;

  const exportFile = () => {
    const data = port.exportData(new Date());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview-lab-datos-${data.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      if (file.size > 10_000_000) throw new Error("El archivo supera 10 MB.");
      const result = port.importData(JSON.parse(await file.text()));
      setMessage({
        tone: result.invalid.length ? "error" : "ok",
        text:
          `Importado: ${result.imported.map((k) => BACKUP_STORE_LABELS[k]).join(", ") || "nada"}.` +
          (result.invalid.length ? ` Partes inválidas ignoradas: ${result.invalid.join(", ")}.` : ""),
      });
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
    }
  };

  return (
    <Card>
      <CardTitle>Copia de seguridad de tus datos</CardTitle>
      <CardDescription>
        Exportá progreso, notas, flashcards, challenges, diagramas, entrevistas y agentes a un archivo JSON.
        Al importar se combina con lo que ya tenés: importar dos veces el mismo archivo no duplica nada.
      </CardDescription>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportFile}>
          <Download aria-hidden /> Exportar datos
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden /> Importar datos
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Archivo de copia de seguridad"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {message ? (
        <p
          role="status"
          className={message.tone === "ok" ? "text-success mt-2 text-sm" : "text-danger mt-2 text-sm"}
        >
          {message.text}
        </p>
      ) : null}
    </Card>
  );
}
