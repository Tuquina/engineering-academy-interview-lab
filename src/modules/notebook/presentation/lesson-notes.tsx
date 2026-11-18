"use client";

import { NotebookPen } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { MAX_NOTE_LENGTH } from "../domain/notebook";
import { useNotebookActions, useNotebookState } from "./notebook-context";

const SAVE_DELAY_MS = 600;

/**
 * Notas personales de una lección con guardado automático (debounce). Las notas son texto plano y se muestran
 * como tal: no se interpretan como HTML ni Markdown.
 */
export function LessonNotes({ lessonId }: { lessonId: string }) {
  const fieldId = useId();
  const stored = useNotebookState().notes[lessonId];
  const { saveNote } = useNotebookActions();
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);

  // Mientras no se edita, el campo muestra lo guardado (que puede llegar después de la hidratación).
  const value = draft ?? stored?.text ?? "";
  const saving = draft !== null && draft !== (stored?.text ?? "");

  // Al salir de la lección se guarda cualquier edición pendiente del debounce.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (pending.current !== null) saveNote(lessonId, pending.current);
    },
    [lessonId, saveNote],
  );

  const onChange = (text: string) => {
    setDraft(text);
    pending.current = text;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveNote(lessonId, text);
      pending.current = null;
      setDraft(null);
    }, SAVE_DELAY_MS);
  };

  return (
    <section aria-labelledby={`${fieldId}-title`} className="border-border bg-surface rounded-lg border p-5">
      <h2
        id={`${fieldId}-title`}
        className="text-foreground mb-1 flex items-center gap-2 text-base font-semibold"
      >
        <NotebookPen aria-hidden className="text-accent size-4" /> Mis notas
      </h2>
      <p className="text-muted mb-3 text-sm">
        Escribí con tus palabras lo que te llevás de la lección: explicarlo es la mejor forma de fijarlo.
      </p>
      <label htmlFor={fieldId} className="sr-only">
        Notas de la lección
      </label>
      <textarea
        id={fieldId}
        value={value}
        maxLength={MAX_NOTE_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="border-border bg-background text-foreground focus-visible:outline-ring w-full resize-y rounded-md border p-3 font-mono text-sm leading-relaxed"
        placeholder="Por ejemplo: type erasure = los tipos no existen en runtime → validar en los límites."
      />
      <p className="text-muted mt-2 flex justify-between text-xs" aria-live="polite">
        <span>{saving ? "Guardando…" : stored ? "Guardado en este navegador" : "Sin notas todavía"}</span>
        <span className="tabular-nums">
          {value.length.toLocaleString("es")}/{MAX_NOTE_LENGTH.toLocaleString("es")}
        </span>
      </p>
    </section>
  );
}
