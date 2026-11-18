import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { SqlExercise } from "../domain/sql-exercise";

const text = z.string().trim().min(1);

const frontmatterSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    id: z.string().regex(/^sql\.[a-z0-9-]+$/),
    title: text,
    difficulty: z.enum(["basic", "intermediate", "advanced"]),
    order: z.number().int(),
    topics: z.array(text).min(1),
    hints: z.array(text).min(1),
    solution: text,
    mode: z.literal("result"),
    orderMatters: z.boolean(),
  }),
  z.strictObject({
    id: z.string().regex(/^sql\.[a-z0-9-]+$/),
    title: text,
    difficulty: z.enum(["basic", "intermediate", "advanced"]),
    order: z.number().int(),
    topics: z.array(text).min(1),
    hints: z.array(text).min(1),
    solution: text,
    mode: z.literal("state"),
    checkQuery: text,
    runTimes: z.number().int().min(1).max(5),
  }),
]);

const EXPLANATION_HEADING = /^## Explicación\s*$/m;

export interface SqlLabContent {
  readonly dataset: string;
  readonly exercises: SqlExercise[];
}

/**
 * Lee el dataset (`content/sql/dataset.sql`) y los ejercicios (`content/sql/exercises/*.md`). Cada ejercicio tiene
 * frontmatter con metadatos y solución, y un cuerpo con `## Enunciado` y `## Explicación`.
 */
export async function loadSqlLab(rootDir: string): Promise<SqlLabContent> {
  const dir = path.join(rootDir, "sql");
  const dataset = await readFile(path.join(dir, "dataset.sql"), "utf8");
  const files = (await readdir(path.join(dir, "exercises"))).filter((f) => f.endsWith(".md")).sort();

  const exercises = await Promise.all(
    files.map(async (file): Promise<SqlExercise> => {
      const filePath = path.join(dir, "exercises", file);
      const { data, content } = matter(await readFile(filePath, "utf8"));
      const parsed = frontmatterSchema.safeParse(data);
      if (!parsed.success)
        throw new Error(`Ejercicio SQL inválido en ${filePath}:\n${z.prettifyError(parsed.error)}`);
      const [prompt = "", explanation = ""] = content.split(EXPLANATION_HEADING);
      if (!explanation.trim()) throw new Error(`${filePath}: falta la sección "## Explicación".`);
      const meta = parsed.data;
      return {
        id: meta.id,
        title: meta.title,
        difficulty: meta.difficulty,
        order: meta.order,
        topics: meta.topics,
        hints: meta.hints,
        solution: meta.solution,
        prompt: prompt.replace(/^## Enunciado\s*$/m, "").trim(),
        explanation: explanation.trim(),
        check:
          meta.mode === "result"
            ? { mode: "result", orderMatters: meta.orderMatters }
            : { mode: "state", checkQuery: meta.checkQuery, runTimes: meta.runTimes },
      };
    }),
  );

  const ids = new Set<string>();
  for (const exercise of exercises) {
    if (ids.has(exercise.id)) throw new Error(`ID de ejercicio SQL duplicado: ${exercise.id}`);
    ids.add(exercise.id);
  }
  return { dataset, exercises: exercises.sort((a, b) => a.order - b.order) };
}
