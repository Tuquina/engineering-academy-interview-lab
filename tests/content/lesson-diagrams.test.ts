// @vitest-environment jsdom
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Los diagramas Mermaid se renderizan en el cliente: un error de sintaxis no rompe el build, sólo muestra el código
 * fuente en la lección. Este test parsea todos los diagramas de lecciones y cheatsheets para detectarlo antes
 * (ADR-0008).
 */
const contentRoot = path.resolve(import.meta.dirname, "../../content");

async function listMdx(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

/** Extrae el contenido de cada `chart={`...`}` de un archivo MDX. */
function extractCharts(source: string): string[] {
  return [...source.matchAll(/chart=\{`([\s\S]*?)`\}/g)].map((match) => match[1]!.trim());
}

describe("diagramas Mermaid del contenido", () => {
  it("todos los diagramas tienen sintaxis válida", async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    const files = [
      ...(await listMdx(path.join(contentRoot, "courses"))),
      ...(await listMdx(path.join(contentRoot, "cheatsheets"))),
    ];
    let count = 0;
    const failures: string[] = [];
    for (const file of files) {
      for (const chart of extractCharts(await readFile(file, "utf8"))) {
        count++;
        try {
          await mermaid.parse(chart);
        } catch (error) {
          failures.push(`${path.relative(contentRoot, file)}: ${(error as Error).message.split("\n")[0]}`);
        }
      }
    }
    expect(failures).toEqual([]);
    expect(count).toBeGreaterThan(0);
  }, 60_000);
});
