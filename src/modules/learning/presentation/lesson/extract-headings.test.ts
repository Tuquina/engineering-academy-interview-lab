import { describe, expect, it } from "vitest";
import { extractHeadings } from "./extract-headings";

describe("extractHeadings", () => {
  it("extrae h2 y h3 con IDs compatibles con rehype-slug", () => {
    const mdx = [
      "# Título",
      "## ¿Qué problema resuelve?",
      "texto",
      "### Type erasure: qué desaparece",
      "## Resumen",
    ].join("\n");
    expect(extractHeadings(mdx)).toEqual([
      { depth: 2, text: "¿Qué problema resuelve?", id: "qué-problema-resuelve" },
      { depth: 3, text: "Type erasure: qué desaparece", id: "type-erasure-qué-desaparece" },
      { depth: 2, text: "Resumen", id: "resumen" },
    ]);
  });

  it("ignora encabezados dentro de bloques de código y quita formato inline", () => {
    const mdx = ["```md", "## No es encabezado", "```", "## El tipo `unknown` y [docs](https://x.y)"].join(
      "\n",
    );
    expect(extractHeadings(mdx)).toEqual([
      { depth: 2, text: "El tipo unknown y docs", id: "el-tipo-unknown-y-docs" },
    ]);
  });

  it("conserva '#' que forma parte del texto y quita la secuencia de cierre", () => {
    expect(extractHeadings("## Comparación con C#\n## Cerrado ##")).toEqual([
      { depth: 2, text: "Comparación con C#", id: "comparación-con-c" },
      { depth: 2, text: "Cerrado", id: "cerrado" },
    ]);
  });

  it("desambigua encabezados repetidos como lo hace github-slugger", () => {
    const ids = extractHeadings("## Ejemplo\n## Ejemplo").map((h) => h.id);
    expect(ids).toEqual(["ejemplo", "ejemplo-1"]);
  });
});
