import GithubSlugger from "github-slugger";

export interface Heading {
  readonly depth: 2 | 3;
  readonly text: string;
  readonly id: string;
}

/**
 * Extrae los encabezados `##` y `###` de un cuerpo MDX para construir la tabla de contenidos.
 *
 * Los IDs se generan con el mismo algoritmo que `rehype-slug` (github-slugger) y recorriendo los encabezados en
 * orden, de modo que coinciden con los anclajes del HTML renderizado, incluidos los duplicados (`-1`, `-2`).
 * Ignora líneas dentro de bloques de código.
 */
export function extractHeadings(mdx: string): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  let inFence = false;

  for (const line of mdx.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // La secuencia de cierre opcional (`## Título ##`) debe ir precedida de un espacio: "C#" no la contiene.
    const match = /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
    if (!match?.[1] || !match[2]) continue;
    const text = toPlainText(match[2]);
    const id = slugger.slug(text);
    const depth = match[1].length;
    if (depth === 2 || depth === 3) headings.push({ depth, text, id });
  }
  return headings;
}

/** Quita el formato Markdown inline más común para obtener el texto visible del encabezado. */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}
