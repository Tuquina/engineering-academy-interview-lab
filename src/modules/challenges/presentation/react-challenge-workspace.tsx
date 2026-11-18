"use client";

import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  SandpackTests,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { CheckCircle2, Play, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePracticeActions, usePracticeState } from "@/modules/exercises/presentation/practice-context";
import { useTheme } from "@/shared/layout/theme-toggle";
import { Button } from "@/shared/ui/button";
import { ResizablePanels } from "@/shared/ui/resizable-panels";
import { ChallengeBrief, type ChallengeBriefContent } from "./challenge-brief";

const APP_FILE = "/App.tsx";
const TEST_FILE = "/App.test.tsx";
const DRAFT_SAVE_DELAY_MS = 800;

interface TestNode {
  status?: string;
}
interface DescribeNode {
  tests?: Record<string, TestNode>;
  describes?: Record<string, DescribeNode>;
}

/** Cuenta tests aprobados y totales en el árbol de resultados de Sandpack (Jest). */
export function countSpecResults(specs: Record<string, DescribeNode>): { passed: number; total: number } {
  let passed = 0;
  let total = 0;
  const visit = (node: DescribeNode) => {
    for (const test of Object.values(node.tests ?? {})) {
      total++;
      if (test.status === "pass") passed++;
    }
    Object.values(node.describes ?? {}).forEach(visit);
  };
  Object.values(specs).forEach(visit);
  return { passed, total };
}

/** Guarda el borrador del componente mientras se edita dentro de Sandpack. */
function DraftSync({ onChange }: { onChange: (code: string) => void }) {
  const { sandpack } = useSandpack();
  const code = sandpack.files[APP_FILE]?.code;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (code !== undefined) onChange(code);
  }, [code, onChange]);
  return null;
}

/**
 * Challenge de React con Sandpack: editor, preview en vivo y tests con Jest y Testing Library en el navegador.
 * Sandpack usa el bundler de CodeSandbox, por lo que este laboratorio necesita conexión a internet.
 */
export function ReactChallengeWorkspace({
  id,
  starter,
  tests,
  referenceSolution,
  ...brief
}: ChallengeBriefContent & { id: string; starter: string; tests: string; referenceSolution: string }) {
  const theme = useTheme();
  const practice = usePracticeState();
  const actions = usePracticeActions();
  const [lastRun, setLastRun] = useState<{ passed: number; total: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // El código inicial se fija al montar: Sandpack mantiene su propio estado de edición después.
  const [initialCode] = useState(() => practice.drafts[id] ?? starter);
  // Código vigente del editor y número de corrida: cada "Ejecutar tests" monta un entorno de tests nuevo.
  const [code, setCode] = useState(initialCode);
  const [runId, setRunId] = useState(0);
  const solved =
    Boolean(practice.attempts[id]?.solvedAt) ||
    (lastRun !== null && lastRun.total > 0 && lastRun.passed === lastRun.total);

  const onCodeChange = useCallback(
    (next: string) => {
      setCode(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => actions.saveDraft(id, next), DRAFT_SAVE_DELAY_MS);
    },
    [actions, id],
  );

  return (
    <ResizablePanels
      initialLeftPercent={36}
      className="min-h-[40rem]"
      left={
        <ChallengeBrief
          {...brief}
          solution={
            <>
              {brief.solutionExplanation}
              <h3>Solución de referencia</h3>
              <pre>
                <code>{referenceSolution}</code>
              </pre>
            </>
          }
          solved={solved}
          onRevealSolution={() => actions.markSolutionRevealed(id)}
        />
      }
      right={
        <div className="flex flex-col gap-3">
          <p className="text-muted flex items-center gap-1.5 text-xs">
            <Wifi aria-hidden className="size-3.5" />
            Sandpack compila y ejecuta el código con el bundler de CodeSandbox: requiere conexión a internet.
          </p>
          <SandpackProvider
            template="react-ts"
            theme={theme === "dark" ? "dark" : "light"}
            files={{
              [APP_FILE]: { code: initialCode, active: true },
              [TEST_FILE]: { code: tests, readOnly: true },
            }}
            options={{ recompileMode: "delayed", recompileDelay: 600, initMode: "immediate" }}
          >
            <DraftSync onChange={onCodeChange} />
            <SandpackLayout>
              <SandpackCodeEditor showTabs showLineNumbers style={{ height: 420 }} />
              <SandpackPreview style={{ height: 420 }} showOpenInCodeSandbox={false} />
            </SandpackLayout>
          </SandpackProvider>
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted text-xs">
              Los tests corren con Jest y Testing Library en un entorno separado del preview.
            </p>
            <Button size="sm" onClick={() => setRunId((n) => n + 1)}>
              <Play /> Ejecutar tests
            </Button>
          </div>
          {/* Entorno de tests (plantilla Jest de Sandpack) con el código actual del editor. */}
          <SandpackProvider
            key={runId}
            template="test-ts"
            theme={theme === "dark" ? "dark" : "light"}
            files={{
              "/App.tsx": { code },
              [TEST_FILE]: { code: tests, active: true },
              "/tsconfig.json": {
                code: JSON.stringify({ compilerOptions: { jsx: "react-jsx", esModuleInterop: true } }),
              },
            }}
            customSetup={{
              dependencies: { react: "18.3.1", "react-dom": "18.3.1", "@testing-library/react": "14.3.1" },
            }}
            options={{ initMode: "immediate" }}
          >
            <div className="border-border overflow-hidden rounded-lg border">
              <SandpackTests
                style={{ height: 260 }}
                onComplete={(specs) => {
                  const result = countSpecResults(specs as unknown as Record<string, DescribeNode>);
                  setLastRun(result);
                  if (result.total > 0) actions.recordAttempt(id, result);
                }}
              />
            </div>
          </SandpackProvider>
          {solved && (
            <p className="text-success flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 aria-hidden className="size-4" /> Challenge resuelto: todos los tests pasan.
            </p>
          )}
        </div>
      }
    />
  );
}
