"use client";

import { FilePlus2, FileUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Button } from "@/shared/ui/button";
import { importDesign } from "../application/design-schema";
import { createDocument, type DesignDocument } from "../domain/canvas";
import { StudioLimitError, freeDocuments } from "../domain/studio";
import { CanvasEditor } from "./canvas-editor";
import { useStudioActions, useStudioState } from "./studio-context";

const newDraft = () => createDocument(crypto.randomUUID(), "Diagrama sin título", new Date());

/**
 * Architecture Canvas libre: varios diagramas guardados en este navegador, con creación, borrado e importación
 * de JSON exportado previamente.
 */
export function FreeCanvas() {
  const isClient = useIsClient();
  const state = useStudioState();
  const { saveDocument, deleteDocument } = useStudioActions();
  const documents = freeDocuments(state);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Diagrama nuevo sin guardar: se persiste recién con el primer cambio del usuario.
  const [draft, setDraft] = useState<DesignDocument>(newDraft);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isClient) {
    return <div className="border-border bg-surface h-[36rem] animate-pulse rounded-lg border" aria-hidden />;
  }

  const active =
    (selectedId ? state.documents[selectedId] : undefined) ??
    (selectedId === draft.id ? draft : (documents[0] ?? draft));

  const persist = (doc: DesignDocument) => {
    try {
      saveDocument(doc);
      setMessage(null);
    } catch (error) {
      if (error instanceof StudioLimitError) setMessage(error.message);
      else throw error;
    }
  };

  const options = [...documents];
  if (!state.documents[active.id]) options.unshift(active);

  return (
    <div className="flex flex-col gap-2">
      {message && (
        <p role="alert" className="text-danger text-sm">
          {message}
        </p>
      )}
      <CanvasEditor
        key={active.id}
        document={active}
        onChange={persist}
        toolbar={
          <>
            <label className="sr-only" htmlFor="canvas-document">
              Diagrama abierto
            </label>
            <select
              id="canvas-document"
              value={active.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="border-border bg-surface text-foreground max-w-48 rounded-md border px-2 py-1.5 text-sm"
            >
              {options.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || "Sin título"}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const doc = newDraft();
                setDraft(doc);
                setSelectedId(doc.id);
              }}
            >
              <FilePlus2 /> Nuevo
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
              <FileUp /> Importar JSON
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Archivo JSON del diagrama"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const result = importDesign(await file.text(), crypto.randomUUID(), new Date());
                if (!result.ok) {
                  setMessage(result.error);
                  return;
                }
                persist(result.document);
                setSelectedId(result.document.id);
              }}
            />
            {state.documents[active.id] && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!window.confirm(`¿Borrar "${active.title}"? No se puede deshacer.`)) return;
                  deleteDocument(active.id);
                  setSelectedId(null);
                  setDraft(newDraft());
                }}
              >
                <Trash2 /> Borrar
              </Button>
            )}
          </>
        }
      />
    </div>
  );
}
