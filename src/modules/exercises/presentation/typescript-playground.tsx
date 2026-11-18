"use client";

import type { Monaco } from "@monaco-editor/react";
import { Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { ResizablePanels } from "@/shared/ui/resizable-panels";
import { ConsoleOutput, TypeDiagnostics } from "./execution-result";
import { usePracticeActions, usePracticeState } from "./practice-context";
import { EXECUTION_LIMITS, useTypeScriptExecution } from "./use-typescript-execution";

const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="text-muted p-4 text-sm">Cargando editor…</div>,
});

export interface SnippetOption {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly code: string;
}

const DRAFT_ID = "playground";
const MODEL_PATH = "file:///playground/main.ts";

/**
 * Playground de TypeScript: editor con chequeo de tipos en vivo, ejecución aislada en un Web Worker, consola con
 * marcas de tiempo y el JavaScript que realmente se ejecuta.
 */
export function TypeScriptPlayground({ snippets }: { snippets: readonly SnippetOption[] }) {
  const practice = usePracticeState();
  const { saveDraft } = usePracticeActions();
  const { execute, running, view } = useTypeScriptExecution();
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [emitted, setEmitted] = useState("");
  const [tab, setTab] = useState<"console" | "js">("console");
  const currentCode = code ?? practice.drafts[DRAFT_ID] ?? snippets[0]?.code ?? "";

  const run = useCallback(async () => {
    if (!monaco || running) return;
    saveDraft(DRAFT_ID, currentCode);
    await execute(monaco, { solution: { path: MODEL_PATH, content: currentCode } });
    const model = monaco.editor.getModel(monaco.Uri.parse(MODEL_PATH));
    if (model) {
      const getWorker = await monaco.typescript.getTypeScriptWorker();
      const client = await getWorker(model.uri);
      const output = await client.getEmitOutput(model.uri.toString());
      setEmitted(output.outputFiles.find((f: { name: string }) => f.name.endsWith(".js"))?.text ?? "");
    }
  }, [monaco, running, saveDraft, currentCode, execute]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run]);

  const report = view?.outcome.kind === "report" ? view.outcome.report : null;

  return (
    <ResizablePanels
      initialLeftPercent={55}
      className="h-[calc(100dvh-12rem)] min-h-[36rem]"
      left={
        <div className="flex h-full min-h-[24rem] flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-muted flex flex-col gap-1 text-xs">
              Ejemplos
              <select
                className="border-border bg-surface text-foreground rounded-md border px-2 py-1.5 text-sm"
                defaultValue=""
                onChange={(event) => {
                  const snippet = snippets.find((s) => s.slug === event.target.value);
                  if (snippet) setCode(snippet.code);
                }}
              >
                <option value="" disabled>
                  Cargar un ejemplo…
                </option>
                {snippets.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="ml-auto"
              size="sm"
              onClick={() => void run()}
              disabled={running || !monaco}
              title="Ctrl + Enter"
            >
              <Play /> {running ? "Ejecutando…" : "Ejecutar"}
            </Button>
          </div>
          <div className="border-border min-h-0 flex-1 overflow-hidden rounded-lg border">
            <CodeEditor
              path={MODEL_PATH}
              value={currentCode}
              language="typescript"
              onChange={(next) => {
                setCode(next);
                saveDraft(DRAFT_ID, next);
              }}
              onMount={(_editor, instance) => setMonaco(instance)}
              ariaLabel="Editor del playground de TypeScript"
            />
          </div>
        </div>
      }
      right={
        <div className="border-border bg-surface flex h-full min-h-[20rem] flex-col rounded-lg border">
          <div role="tablist" aria-label="Salida" className="border-border flex gap-1 border-b px-2 pt-2">
            {(
              [
                ["console", "Consola"],
                ["js", "JavaScript emitido"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm",
                  tab === id ? "border-accent text-foreground font-medium" : "text-muted border-transparent",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {tab === "console" && (
              <>
                {view && <TypeDiagnostics diagnostics={view.diagnostics} />}
                {view?.outcome.kind === "hard-timeout" && (
                  <p role="alert" className="text-danger text-sm">
                    La ejecución superó {view.outcome.limitMs / 1000} s y se detuvo (¿bucle infinito?).
                  </p>
                )}
                {report?.error && (
                  <p role="alert" className="text-danger font-mono text-xs [overflow-wrap:anywhere]">
                    {report.error}
                  </p>
                )}
                {report ? (
                  <>
                    <ConsoleOutput logs={report.logs} />
                    <p className="text-muted text-xs">
                      Ejecutado en {report.durationMs} ms en un Web Worker aislado.
                      {report.pendingTimers &&
                        ` Quedaban temporizadores activos a los ${EXECUTION_LIMITS.scriptSettleMs / 1000} s y se cancelaron.`}
                    </p>
                  </>
                ) : (
                  <p className="text-muted text-sm">
                    Ejecutá con el botón o con <kbd className="font-mono">Ctrl + Enter</kbd>. El código no
                    tiene acceso a red ni al resto de la página.
                  </p>
                )}
              </>
            )}
            {tab === "js" &&
              (emitted ? (
                <pre className="bg-background border-border overflow-auto rounded-md border p-3 font-mono text-xs">
                  {emitted}
                </pre>
              ) : (
                <p className="text-muted text-sm">
                  Ejecutá el código para ver el JavaScript que produce el compilador.
                </p>
              ))}
          </div>
        </div>
      }
    />
  );
}
