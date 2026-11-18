import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { CheatsheetMeta } from "../domain/cheatsheet";

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

const frontmatterSchema = z.strictObject({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  order: z.number().int(),
  tags: z.array(z.string().trim().min(1)).default([]),
  relatedLessons: z.array(id).default([]),
});

export interface Cheatsheet extends CheatsheetMeta {
  readonly body: string;
}

/**
 * Lee las cheatsheets de `content/cheatsheets/*.mdx` (el slug es el nombre del archivo).
 * La existencia de las lecciones relacionadas se verifica en el test de integridad del contenido.
 */
export async function loadCheatsheets(rootDir: string): Promise<Cheatsheet[]> {
  const dir = path.join(rootDir, "cheatsheets");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx")).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const sheets = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(dir, file);
      const { data, content } = matter(await readFile(filePath, "utf8"));
      const parsed = frontmatterSchema.safeParse(data);
      if (!parsed.success)
        throw new Error(`Cheatsheet inválida en ${filePath}:\n${z.prettifyError(parsed.error)}`);
      return { ...parsed.data, slug: file.replace(/\.mdx$/, ""), body: content };
    }),
  );
  return sheets.sort((a, b) => a.order - b.order);
}
