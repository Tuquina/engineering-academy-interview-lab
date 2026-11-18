import path from "node:path";
import type { Metadata } from "next";
import { loadPlaygroundSnippets } from "@/modules/exercises/infrastructure/file-system-snippet-source";
import { TypeScriptPlayground } from "@/modules/exercises/presentation/typescript-playground";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";

export const metadata: Metadata = { title: "Laboratorio de código" };

export default async function LabPage() {
  const snippets = await loadPlaygroundSnippets(path.join(process.cwd(), "content"));
  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <header className="mb-4">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Laboratorio de código · TypeScript
        </h1>
        <p className="text-muted mt-1 text-sm">
          Escribí TypeScript con chequeo de tipos en vivo y ejecutalo en tu navegador. Ideal para comprobar el
          orden del event loop, probar tipos o ensayar una respuesta de entrevista.
        </p>
      </header>
      <TypeScriptPlayground snippets={snippets} />
    </div>
  );
}
