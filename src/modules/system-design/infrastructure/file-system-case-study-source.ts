import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { CaseStudy } from "../domain/case-study";
import { SIMULATIONS } from "../domain/simulations/catalog";

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const text = z.string().trim().min(1);

const schema = z.strictObject({
  id: z.string().regex(/^case\.[a-z0-9-]+$/),
  title: text,
  summary: text,
  difficulty: z.enum(["basic", "intermediate", "advanced"]),
  durationMinutes: z.number().int().positive(),
  order: z.number().int(),
  tags: z.array(text).min(1),
  diagram: id,
  functionalRequirements: z.array(text).min(3),
  nonFunctionalRequirements: z.array(text).min(3),
  estimates: z.array(z.strictObject({ label: text, value: text, detail: text })).min(2),
  followUps: z.array(text).min(2),
  relatedPatterns: z.array(id).default([]),
  relatedSimulations: z.array(id).default([]),
});

/**
 * Lee los casos de estudio de `content/system-design/cases/<slug>.mdx`. Valida el frontmatter y que los
 * simuladores referenciados existan; los diagramas y patrones los verifica el test de contenido, que conoce ambos
 * catálogos.
 *
 * @throws {Error} con el archivo exacto si algo es inválido.
 */
export async function loadCaseStudies(rootDir: string): Promise<CaseStudy[]> {
  const dir = path.join(rootDir, "system-design", "cases");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx")).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const simulations = new Set(SIMULATIONS.map((s) => s.slug));
  const cases = await Promise.all(
    files.map(async (file): Promise<CaseStudy> => {
      const filePath = path.join(dir, file);
      const { data, content } = matter(await readFile(filePath, "utf8"));
      const parsed = schema.safeParse(data);
      if (!parsed.success)
        throw new Error(`Caso de estudio inválido en ${filePath}:\n${z.prettifyError(parsed.error)}`);
      for (const simulation of parsed.data.relatedSimulations) {
        if (!simulations.has(simulation))
          throw new Error(`${filePath} referencia el simulador inexistente ${simulation}.`);
      }
      return { ...parsed.data, slug: file.replace(/\.mdx$/, ""), body: content };
    }),
  );
  const ids = new Set<string>();
  for (const study of cases) {
    if (ids.has(study.id)) throw new Error(`ID de caso de estudio duplicado: ${study.id}`);
    ids.add(study.id);
  }
  return cases.sort((a, b) => a.order - b.order);
}
