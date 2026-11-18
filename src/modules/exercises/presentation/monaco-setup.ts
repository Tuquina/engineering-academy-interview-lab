"use client";

import { loader, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

/**
 * Monaco se sirve desde la propia app (`public/monaco`, copiado por `scripts/copy-monaco.mjs`): no depende de un CDN
 * externo y funciona en local sin conexión.
 */
loader.config({ paths: { vs: "/monaco/vs" } });

let configured = false;

/**
 * Configuración global del servicio de TypeScript de Monaco. Debe coincidir con `EXERCISE_COMPILER_OPTIONS`
 * (tests/support/compile-typescript.ts), usada para verificar las soluciones en CI.
 */
export function configureMonaco(monaco: Monaco): void {
  if (configured) return;
  configured = true;
  const ts = monaco.typescript;
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    lib: ["es2022", "dom"],
    strict: true,
    esModuleInterop: true,
    allowNonTsExtensions: true,
  });
  ts.typescriptDefaults.setEagerModelSync(true);
}

export interface CompiledFile {
  readonly js: string;
}

export interface TypeDiagnostic {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

function flatten(message: string | { messageText: string; next?: unknown[] }): string {
  if (typeof message === "string") return message;
  const rest = (message.next ?? []) as Array<string | { messageText: string; next?: unknown[] }>;
  return [message.messageText, ...rest.map(flatten)].join(" ");
}

/**
 * Compila modelos TypeScript a CommonJS con el worker de TypeScript de Monaco y devuelve los errores de tipos.
 *
 * @param models modelos a compilar (por ejemplo, solución y tests); el orden se respeta en el resultado.
 * @param checkFiles nombres de archivo cuyos diagnósticos se informan (por defecto, todos).
 */
export async function compileModels(
  monaco: Monaco,
  models: readonly editor.ITextModel[],
): Promise<{ outputs: string[]; diagnostics: TypeDiagnostic[] }> {
  const getWorker = await monaco.typescript.getTypeScriptWorker();
  const client = await getWorker(...models.map((m) => m.uri));
  const outputs: string[] = [];
  const diagnostics: TypeDiagnostic[] = [];

  for (const model of models) {
    const fileName = model.uri.toString();
    const emit = await client.getEmitOutput(fileName);
    outputs.push(emit.outputFiles.find((f: { name: string }) => f.name.endsWith(".js"))?.text ?? "");
    const found = [
      ...(await client.getSyntacticDiagnostics(fileName)),
      ...(await client.getSemanticDiagnostics(fileName)),
    ];
    for (const d of found) {
      const position = model.getPositionAt(d.start ?? 0);
      diagnostics.push({
        file: model.uri.path.split("/").at(-1) ?? fileName,
        line: position.lineNumber,
        column: position.column,
        message: flatten(d.messageText as Parameters<typeof flatten>[0]),
      });
    }
  }
  return { outputs, diagnostics };
}

/** Crea (o reutiliza) un modelo que no se muestra en ningún editor, por ejemplo para los tests ocultos. */
export function ensureModel(
  monaco: Monaco,
  path: string,
  content: string,
  language = "typescript",
): editor.ITextModel {
  const uri = monaco.Uri.parse(path);
  const existing = monaco.editor.getModel(uri);
  if (existing) {
    if (existing.getValue() !== content) existing.setValue(content);
    return existing;
  }
  return monaco.editor.createModel(content, language, uri);
}
