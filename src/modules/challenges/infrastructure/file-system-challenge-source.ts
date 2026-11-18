import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { Challenge } from "../domain/challenge";

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const text = z.string().trim().min(1);

const baseSchema = z.strictObject({
  id,
  title: text,
  summary: text,
  difficulty: z.enum(["basic", "intermediate", "advanced"]),
  durationMinutes: z.number().int().positive(),
  technologies: z.array(text).min(1),
  topics: z.array(text).min(1),
  skills: z.array(text).min(1),
  interviewType: z.enum(["live-coding", "take-home", "system-design", "technical-deep-dive"]),
  order: z.number().int(),
  constraints: z.array(text).default([]),
  acceptanceCriteria: z.array(text).min(1),
  hints: z.array(text).min(1),
  followUpQuestions: z.array(text).min(1),
  relatedLessons: z.array(id).default([]),
});

const frontmatterSchema = z.discriminatedUnion("kind", [
  baseSchema.extend({ kind: z.literal("code") }),
  baseSchema.extend({ kind: z.literal("react") }),
  baseSchema.extend({ kind: z.literal("sql"), sqlExerciseId: id }),
  baseSchema.extend({
    kind: z.literal("design"),
    rubric: z
      .array(z.strictObject({ id, criterion: text, description: text, weight: z.number().positive() }))
      .min(3),
  }),
]);

const REACT_FILES = {
  starter: "starter.tsx",
  tests: "tests.tsx",
  solution: "solution.tsx",
} as const;

const CODE_FILES = {
  starter: "starter.ts",
  tests: "tests.ts",
  hiddenTests: "hidden-tests.ts",
  solution: "solution.ts",
} as const;

/**
 * Lee los challenges de `content/challenges/<slug>/`:
 * - `challenge.mdx`: frontmatter (metadatos) + enunciado.
 * - `solution.mdx`: explicación de la solución.
 * - Para challenges de código: `starter.ts`, `tests.ts`, `hidden-tests.ts` y `solution.ts`.
 *
 * @throws {Error} con el archivo exacto si algo falta o es inválido.
 */
export async function loadChallenges(rootDir: string): Promise<Challenge[]> {
  const dir = path.join(rootDir, "challenges");
  let entries: string[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const challenges = await Promise.all(
    entries.map(async (slug): Promise<Challenge> => {
      const base = path.join(dir, slug);
      const challengePath = path.join(base, "challenge.mdx");
      const { data, content } = matter(await readFile(challengePath, "utf8"));
      const parsed = frontmatterSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`Challenge inválido en ${challengePath}:\n${z.prettifyError(parsed.error)}`);
      }
      const solutionExplanation = await readRequired(path.join(base, "solution.mdx"));
      const common = { ...parsed.data, slug, statement: content, solutionExplanation };

      if (common.kind === "code") {
        const files = Object.fromEntries(
          await Promise.all(
            Object.entries(CODE_FILES).map(async ([key, file]) => [
              key,
              await readRequired(path.join(base, file)),
            ]),
          ),
        ) as Record<keyof typeof CODE_FILES, string>;
        return { ...common, kind: "code", files };
      }
      if (common.kind === "react") {
        const files = Object.fromEntries(
          await Promise.all(
            Object.entries(REACT_FILES).map(async ([key, file]) => [
              key,
              await readRequired(path.join(base, file)),
            ]),
          ),
        ) as Record<keyof typeof REACT_FILES, string>;
        return { ...common, kind: "react", files };
      }
      return common;
    }),
  );

  const ids = new Set<string>();
  for (const challenge of challenges) {
    if (ids.has(challenge.id)) throw new Error(`ID de challenge duplicado: ${challenge.id}`);
    ids.add(challenge.id);
  }
  return challenges.sort((a, b) => a.order - b.order);
}

async function readRequired(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    throw new Error(`Falta el archivo requerido ${filePath}`);
  }
}
