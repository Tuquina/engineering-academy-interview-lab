import type { Metadata } from "next";
import { getCheatsheets } from "@/infrastructure/composition/content-extras";
import { CheatsheetList } from "@/modules/notebook/presentation/cheatsheet-list";

export const metadata: Metadata = { title: "Cheatsheets" };

export default async function CheatsheetsPage() {
  const sheets = await getCheatsheets();
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Cheatsheets</h1>
        <p className="text-muted mt-1">
          Referencias rápidas para repasar antes de una entrevista. Cada una enlaza a las lecciones que la
          explican en profundidad.
        </p>
      </header>
      <CheatsheetList
        sheets={sheets.map(({ slug, title, description, tags }) => ({ slug, title, description, tags }))}
      />
    </div>
  );
}
