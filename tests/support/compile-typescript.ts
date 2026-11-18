import ts from "typescript";
import { HARNESS_TYPE_DECLARATIONS } from "@/modules/exercises/domain/test-harness";

/**
 * Opciones de compilación de los ejercicios. Deben coincidir con las que usa el editor (Monaco) en el navegador
 * para que "compila en CI" signifique "compila para el usuario".
 */
export const EXERCISE_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
  strict: true,
  noEmit: false,
  esModuleInterop: true,
  skipLibCheck: true,
  types: [],
};

/** Transpila TypeScript a CommonJS sin chequear tipos (como hace el runner antes de ejecutar). */
export function transpile(source: string): string {
  return ts.transpileModule(source, { compilerOptions: EXERCISE_COMPILER_OPTIONS }).outputText;
}

/**
 * Chequea tipos de un conjunto de archivos virtuales (`solution.ts`, `tests.ts`, …) junto con las declaraciones
 * del harness. Devuelve los diagnósticos formateados; vacío si no hay errores.
 */
export function typeCheck(files: Readonly<Record<string, string>>): string[] {
  const root = "/virtual/";
  const virtual = new Map<string, string>([
    [`${root}harness.d.ts`, HARNESS_TYPE_DECLARATIONS],
    ...Object.entries(files).map(([name, content]) => [`${root}${name}`, content] as [string, string]),
  ]);
  const host = ts.createCompilerHost(EXERCISE_COMPILER_OPTIONS);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const content = virtual.get(fileName);
    return content !== undefined
      ? ts.createSourceFile(fileName, content, languageVersion, true)
      : originalGetSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  const originalFileExists = host.fileExists.bind(host);
  host.fileExists = (fileName) => virtual.has(fileName) || originalFileExists(fileName);
  const originalReadFile = host.readFile.bind(host);
  host.readFile = (fileName) => virtual.get(fileName) ?? originalReadFile(fileName);
  const originalDirectoryExists = host.directoryExists?.bind(host);
  host.directoryExists = (dir) => dir.startsWith("/virtual") || (originalDirectoryExists?.(dir) ?? false);
  host.realpath = (p) => p;

  const program = ts.createProgram([...virtual.keys()], { ...EXERCISE_COMPILER_OPTIONS, noEmit: true }, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map(
      (d) =>
        `${d.file?.fileName.replace(root, "") ?? ""}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
    );
}
