import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import {
  COMPARISON_DIMENSIONS,
  type ArchitectureProfile,
  type ComparisonDimension,
} from "../domain/comparison";
import { validateDiagram, type ArchitectureDiagram } from "../domain/diagram";
import type { Pattern } from "../domain/pattern";

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const text = z.string().trim().min(1);

const patternSchema = z.strictObject({
  id: z.string().regex(/^pattern\.[a-z0-9-]+$/),
  kind: z.enum(["design", "architecture"]),
  category: z.enum([
    "creational",
    "structural",
    "behavioral",
    "data-access",
    "application-architecture",
    "distributed-data",
    "resilience",
    "integration",
  ]),
  title: text,
  summary: text,
  difficulty: z.enum(["basic", "intermediate", "advanced"]),
  order: z.number().int(),
  definition: text,
  problem: text,
  benefits: z.array(text).min(2),
  costs: z.array(text).min(2),
  alternatives: z.array(z.strictObject({ name: text, when: text })).min(1),
  commonMistakes: z.array(text).min(2),
  avoidWhen: z.array(text).min(1),
  interviewQuestions: z.array(z.strictObject({ question: text, answer: text })).min(2),
  diagrams: z.array(id).default([]),
  related: z.array(id).default([]),
  relatedLessons: z.array(id).default([]),
  tags: z.array(text).min(1),
});

const diagramSchema = z.strictObject({
  id,
  title: text,
  description: text,
  kind: z.enum(["architecture", "sequence-flow", "dependency"]),
  tags: z.array(text).min(1),
  nodes: z
    .array(
      z.strictObject({
        id,
        label: text,
        kind: z.enum([
          "actor",
          "ui",
          "service",
          "domain",
          "port",
          "adapter",
          "database",
          "queue",
          "cache",
          "external",
          "worker",
          "boundary",
        ]),
        column: z.number().min(0),
        row: z.number().min(0),
        responsibility: text,
        examples: z.array(text).min(1),
        parent: id.optional(),
      }),
    )
    .min(2),
  edges: z.array(
    z.strictObject({
      id,
      from: id,
      to: id,
      kind: z.enum(["sync", "async", "dependency"]),
      label: text.optional(),
    }),
  ),
  steps: z
    .array(z.strictObject({ title: text, description: text, highlight: z.array(id).min(1) }))
    .default([]),
});

const assessment = z.strictObject({ level: z.enum(["low", "medium", "high"]), explanation: text });

const profilesSchema = z
  .array(
    z.strictObject({
      id,
      title: text,
      summary: text,
      fitsWhen: z.array(text).min(1),
      patternSlug: id.optional(),
      assessments: z.strictObject(
        Object.fromEntries(COMPARISON_DIMENSIONS.map((d) => [d, assessment])) as Record<
          ComparisonDimension,
          typeof assessment
        >,
      ),
    }),
  )
  .min(2);

export interface ArchitectureContent {
  readonly patterns: readonly Pattern[];
  readonly diagrams: readonly ArchitectureDiagram[];
  readonly profiles: readonly ArchitectureProfile[];
}

async function listFiles(dir: string, extension: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith(extension)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Lee `content/architecture/`:
 * - `patterns/<slug>.mdx`: frontmatter validado + cuerpo con las secciones requeridas.
 * - `diagrams/<id>.json`: diagramas interactivos (se valida la integridad de nodos, conexiones y pasos).
 * - `architectures.json`: perfiles del comparador (todas las dimensiones son obligatorias).
 *
 * Además verifica referencias cruzadas: diagramas y patrones relacionados que existan.
 *
 * @throws {Error} con el archivo exacto si algo es inválido.
 */
export async function loadArchitectureContent(rootDir: string): Promise<ArchitectureContent> {
  const base = path.join(rootDir, "architecture");

  const diagramFiles = await listFiles(path.join(base, "diagrams"), ".json");
  const diagrams = await Promise.all(
    diagramFiles.map(async (file) => {
      const filePath = path.join(base, "diagrams", file);
      const parsed = diagramSchema.safeParse(JSON.parse(await readFile(filePath, "utf8")));
      if (!parsed.success)
        throw new Error(`Diagrama inválido en ${filePath}:\n${z.prettifyError(parsed.error)}`);
      const problems = validateDiagram(parsed.data);
      if (problems.length > 0)
        throw new Error(`Diagrama inconsistente en ${filePath}:\n- ${problems.join("\n- ")}`);
      if (`${parsed.data.id}.json` !== file)
        throw new Error(`El id de ${filePath} debe coincidir con el archivo.`);
      return parsed.data;
    }),
  );
  const diagramIds = new Set(diagrams.map((d) => d.id));

  const patternFiles = await listFiles(path.join(base, "patterns"), ".mdx");
  const patterns = await Promise.all(
    patternFiles.map(async (file): Promise<Pattern> => {
      const filePath = path.join(base, "patterns", file);
      const { data, content } = matter(await readFile(filePath, "utf8"));
      const parsed = patternSchema.safeParse(data);
      if (!parsed.success)
        throw new Error(`Patrón inválido en ${filePath}:\n${z.prettifyError(parsed.error)}`);
      for (const diagram of parsed.data.diagrams) {
        if (!diagramIds.has(diagram))
          throw new Error(`${filePath} referencia el diagrama inexistente ${diagram}.`);
      }
      return { ...parsed.data, slug: file.replace(/\.mdx$/, ""), body: content };
    }),
  );
  const slugs = new Set(patterns.map((p) => p.slug));
  const ids = new Set<string>();
  for (const pattern of patterns) {
    if (ids.has(pattern.id)) throw new Error(`ID de patrón duplicado: ${pattern.id}`);
    ids.add(pattern.id);
    for (const related of pattern.related) {
      if (!slugs.has(related))
        throw new Error(`El patrón ${pattern.slug} referencia ${related}, que no existe.`);
    }
  }

  const profilesPath = path.join(base, "architectures.json");
  let profiles: ArchitectureProfile[] = [];
  try {
    const parsed = profilesSchema.safeParse(JSON.parse(await readFile(profilesPath, "utf8")));
    if (!parsed.success)
      throw new Error(`Comparador inválido en ${profilesPath}:\n${z.prettifyError(parsed.error)}`);
    profiles = parsed.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const profile of profiles) {
    if (profile.patternSlug && !slugs.has(profile.patternSlug)) {
      throw new Error(`El perfil ${profile.id} referencia el patrón inexistente ${profile.patternSlug}.`);
    }
  }

  return {
    patterns: patterns.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    diagrams,
    profiles,
  };
}
