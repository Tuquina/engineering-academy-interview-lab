import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { ArchitectureChallenge } from "../domain/architecture-challenge";
import { SIMULATIONS } from "../domain/simulations/catalog";

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const text = z.string().trim().min(1);

const schema = z.strictObject({
  id: z.string().regex(/^sd\.[a-z0-9-]+$/),
  title: text,
  summary: text,
  difficulty: z.enum(["basic", "intermediate", "advanced"]),
  durationMinutes: z.number().int().positive(),
  order: z.number().int(),
  topics: z.array(text).min(1),
  functionalRequirements: z.array(text).min(3),
  nonFunctionalRequirements: z.array(text).min(3),
  scale: z.array(text).min(1),
  clarifyingQuestions: z.array(z.strictObject({ question: text, why: text })).min(3),
  checklist: z.array(text).min(5),
  rubric: z
    .array(z.strictObject({ id, criterion: text, description: text, weight: z.number().positive() }))
    .min(4),
  relatedPatterns: z.array(id).default([]),
  relatedSimulations: z.array(id).default([]),
});

/**
 * Lee `content/system-design/challenges/<slug>/` (`challenge.mdx` con el escenario y `solution.mdx` con el diseño
 * de referencia). Valida que los simuladores referenciados existan; las referencias a patrones las valida el test
 * de contenido, que conoce ambos catálogos.
 *
 * @throws {Error} con el archivo exacto si algo falta o es inválido.
 */
export async function loadArchitectureChallenges(rootDir: string): Promise<ArchitectureChallenge[]> {
  const dir = path.join(rootDir, "system-design", "challenges");
  let slugs: string[];
  try {
    slugs = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const simulations = new Set(SIMULATIONS.map((s) => s.slug));

  const challenges = await Promise.all(
    slugs.map(async (slug): Promise<ArchitectureChallenge> => {
      const filePath = path.join(dir, slug, "challenge.mdx");
      const { data, content } = matter(await readFile(filePath, "utf8"));
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        throw new Error(
          `Challenge de arquitectura inválido en ${filePath}:\n${z.prettifyError(parsed.error)}`,
        );
      }
      for (const simulation of parsed.data.relatedSimulations) {
        if (!simulations.has(simulation))
          throw new Error(`${filePath} referencia el simulador inexistente ${simulation}.`);
      }
      const solution = await readFile(path.join(dir, slug, "solution.mdx"), "utf8");
      return { ...parsed.data, slug, context: content, solution };
    }),
  );
  return challenges.sort((a, b) => a.order - b.order);
}
