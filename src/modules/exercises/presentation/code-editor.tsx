"use client";

import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useTheme } from "@/shared/layout/theme-toggle";
import { configureMonaco } from "./monaco-setup";

export interface CodeEditorProps {
  /** URI del modelo (p. ej. `file:///challenges/debounce/solution.ts`); define el archivo para el servicio de TS. */
  path: string;
  value: string;
  language: "typescript" | "sql";
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
  height?: string;
  onMount?: (editor: Parameters<OnMount>[0], monaco: Monaco) => void;
}

/**
 * Editor de código basado en Monaco (el motor de VS Code): resaltado, autocompletado y chequeo de tipos en vivo
 * para TypeScript. Se carga en el cliente bajo demanda; mientras tanto se muestra un estado de carga.
 */
export function CodeEditor({
  path,
  value,
  language,
  onChange,
  readOnly = false,
  ariaLabel,
  height = "100%",
  onMount,
}: CodeEditorProps) {
  const theme = useTheme();
  return (
    <Editor
      path={path}
      value={value}
      language={language}
      height={height}
      theme={theme === "dark" ? "vs-dark" : "vs"}
      keepCurrentModel
      beforeMount={configureMonaco}
      onMount={onMount}
      onChange={(next) => onChange?.(next ?? "")}
      loading={<div className="text-muted p-4 text-sm">Cargando editor…</div>}
      options={{
        readOnly,
        ariaLabel,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        wordWrap: "on",
        renderLineHighlight: readOnly ? "none" : "line",
        padding: { top: 12 },
      }}
    />
  );
}
