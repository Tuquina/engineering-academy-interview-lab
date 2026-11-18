"use client";

import type { Monaco } from "@monaco-editor/react";
import { CheckCircle2, Maximize2, Minimize2, Play, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { HARNESS_TYPE_DECLARATIONS } from "@/modules/exercises/domain/test-harness";
import { TestResultPanel, isSolved } from "@/modules/exercises/presentation/execution-result";
import { usePracticeActions, usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { useTypeScriptExecution } from "@/modules/exercises/presentation/use-typescript-execution";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { ResizablePanels } from "@/shared/ui/resizable-panels";
import { ChallengeBrief } from "./challenge-brief";

const CodeEditor = dynamic(
  () => import("@/modules/exercises/presentation/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => <div className="text-muted p-4 text-sm">Cargando editor…</div>,
  },
);

const DRAFT_SAVE_DELAY_MS = 800;

export interface CodeChallengeWorkspaceProps {
  id: string;
  slug: string;
  starter: string;
  tests: string;
  hiddenTests: string;
  referenceSolution: string;
  statement: ReactNode;
  solutionExplanation: ReactNode;
  constraints: readonly string[];
  acceptanceCriteria: readonly string[];
  hints: readonly string[];
  followUpQuestions: readonly string[];
}

/**
 * Espacio de trabajo de un challenge de código: enunciado y pistas a la izquierda; editor, tests y resultados a la
 * derecha. El código se compila con el servicio de TypeScript de Monaco y se ejecuta en un Web Worker aislado.
 */
export function CodeChallengeWorkspace(props: CodeChallengeWorkspaceProps) {
  const { id, slug } = props;
  const practice = usePracticeState();
  const actions = usePracticeActions();
  const { execute, running, view } = useTypeScriptExecution();
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const [fileTab, setFileTab] = useState<"solution" | "tests" | "reference">("solution");
  const [fullscreen, setFullscreen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  // Mientras no se edita, se muestra el borrador guardado (si existe) o el starter.
  const currentCode = code ?? practice.drafts[id] ?? props.starter;
  const record = practice.attempts[id];
  const paths = {
    solution: `file:///challenges/${slug}/solution.ts`,
    tests: `file:///challenges/${slug}/tests.ts`,
    hidden: `file:///challenges/${slug}/hidden-tests.ts`,
    reference: `file:///challenges/${slug}/reference/solution.ts`,
  };

  const onEditorMount = useCallback((_editor: unknown, instance: Monaco) => setMonaco(instance), []);

  // Declaraciones de `test`, `expect`, etc. sólo mientras este workspace está abierto.
  useEffect(() => {
    if (!monaco) return;
    const lib = monaco.typescript.typescriptDefaults.addExtraLib(
      HARNESS_TYPE_DECLARATIONS,
      "file:///harness.d.ts",
    );
    return () => lib.dispose();
  }, [monaco]);

  const onChange = (next: string) => {
    setCode(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => actions.saveDraft(id, next), DRAFT_SAVE_DELAY_MS);
  };

  const runTests = useCallback(async () => {
    if (!monaco || running) return;
    actions.saveDraft(id, currentCode);
    const result = await execute(monaco, {
      solution: { path: paths.solution, content: currentCode },
      tests: { path: paths.tests, content: props.tests },
      hiddenTests: { path: paths.hidden, content: props.hiddenTests },
    });
    // Un intento con errores de tipos no cuenta como resuelto aunque los tests pasen (isSolved lo contempla).
    actions.recordAttempt(id, isSolved(result));
  }, [
    actions,
    currentCode,
    execute,
    id,
    monaco,
    paths.hidden,
    paths.solution,
    paths.tests,
    props.hiddenTests,
    props.tests,
    running,
  ]);

  // Ctrl/Cmd + Enter ejecuta los tests.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void runTests();
      }
      if (event.key === "Escape" && fullscreen) setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runTests, fullscreen]);

  const solvedNow = view ? isSolved(view).solved : false;
  const solved = Boolean(record?.solvedAt) || solvedNow;

  const editorPanel = (
    <div
      className={cn(
        "flex h-full min-h-[32rem] flex-col gap-3",
        fullscreen && "bg-background fixed inset-0 z-50 p-4",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Archivos"
          className="border-border bg-surface-2 flex rounded-md border p-0.5"
        >
          {(
            [
              ["solution", "solution.ts"],
              ["tests", "tests.ts"],
              ...(solved || practice.solutionsRevealed.includes(id) ? [["reference", "referencia.ts"]] : []),
            ] as Array<[typeof fileTab, string]>
          ).map(([tab, label]) => (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={fileTab === tab}
              onClick={() => setFileTab(tab)}
              className={cn(
                "rounded px-3 py-1 font-mono text-xs",
                fileTab === tab ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCode(props.starter);
              actions.saveDraft(id, props.starter);
            }}
            title="Volver al código inicial"
          >
            <RotateCcw /> Reiniciar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <Button size="sm" onClick={() => void runTests()} disabled={running} title="Ctrl + Enter">
            <Play /> {running ? "Ejecutando…" : "Ejecutar tests"}
          </Button>
        </div>
      </div>

      <div className="border-border min-h-[18rem] flex-1 overflow-hidden rounded-lg border">
        {fileTab === "solution" && (
          <CodeEditor
            path={paths.solution}
            value={currentCode}
            language="typescript"
            onChange={onChange}
            onMount={onEditorMount}
            ariaLabel="Editor de la solución"
          />
        )}
        {fileTab === "tests" && (
          <CodeEditor
            path={paths.tests}
            value={props.tests}
            language="typescript"
            readOnly
            onMount={onEditorMount}
            ariaLabel="Tests públicos (sólo lectura)"
          />
        )}
        {fileTab === "reference" && (
          <CodeEditor
            path={paths.reference}
            value={props.referenceSolution}
            language="typescript"
            readOnly
            onMount={onEditorMount}
            ariaLabel="Solución de referencia (sólo lectura)"
          />
        )}
      </div>

      <section
        aria-label="Resultados"
        className="border-border bg-surface max-h-[45vh] overflow-y-auto rounded-lg border p-4"
      >
        {solved && (
          <p className="text-success mb-3 flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 aria-hidden className="size-4" /> Challenge resuelto
            {record ? ` · ${record.attempts} ${record.attempts === 1 ? "intento" : "intentos"}` : ""}
          </p>
        )}
        {view ? (
          <TestResultPanel view={view} />
        ) : (
          <p className="text-muted text-sm">
            Ejecutá los tests con el botón o con <kbd className="font-mono">Ctrl + Enter</kbd>. Además de los
            tests públicos se ejecutan tests ocultos con casos límite. El código corre en un Web Worker
            aislado de tu navegador, nunca en el servidor.
          </p>
        )}
        {solvedNow && (
          <div className="border-border mt-4 border-t pt-4 text-sm">
            <p className="text-foreground mb-1 font-medium">Autorrevisión antes de dar por terminado</p>
            <p className="text-muted">
              Los tests verifican el comportamiento, no la calidad. Revisá: ¿la complejidad es la esperada?
              ¿Los nombres se entienden sin comentarios? ¿Manejás los errores de forma explícita? Después
              compará con la solución de referencia y respondé las preguntas de seguimiento en voz alta.
            </p>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <ResizablePanels
      initialLeftPercent={40}
      left={
        <ChallengeBrief
          statement={props.statement}
          constraints={props.constraints}
          acceptanceCriteria={props.acceptanceCriteria}
          hints={props.hints}
          followUpQuestions={props.followUpQuestions}
          solution={props.solutionExplanation}
          solved={solved}
          onRevealSolution={() => actions.markSolutionRevealed(id)}
        />
      }
      right={editorPanel}
      className="h-[calc(100dvh-11rem)] min-h-[40rem]"
    />
  );
}
