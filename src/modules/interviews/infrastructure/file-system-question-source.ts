import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { INTERVIEW_AREAS, type InterviewQuestion } from "../domain/question";

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const text = z.string().trim().min(1);

const schema = z.strictObject({
  id: z.string().regex(/^iq\.[a-z0-9-]+$/),
  format: z.enum(["quick", "deep-dive"]),
  question: text,
  expectedPoints: z
    .array(z.strictObject({ id, point: text }))
    .min(3)
    .max(7),
  followUps: z.array(text).min(1),
  commonMistakes: z.array(text).min(1),
  relatedLessons: z.array(id).default([]),
  relatedPatterns: z.array(id).default([]),
});

/**
 * Lee el banco de preguntas de `content/interview/questions/<área>/<slug>.md`: el área sale de la carpeta, el
 * frontmatter trae criterios y seguimiento, y el cuerpo es la respuesta sólida de referencia.
 *
 * @throws {Error} con el archivo exacto si algo es inválido o hay IDs o criterios duplicados.
 */
export async function loadInterviewQuestions(rootDir: string): Promise<InterviewQuestion[]> {
  const base = path.join(rootDir, "interview", "questions");
  const questions: InterviewQuestion[] = [];
  for (const area of INTERVIEW_AREAS) {
    let files: string[];
    try {
      files = (await readdir(path.join(base, area))).filter((f) => f.endsWith(".md")).sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    for (const file of files) {
      const filePath = path.join(base, area, file);
      const { data, content } = matter(await readFile(filePath, "utf8"));
      const parsed = schema.safeParse(data);
      if (!parsed.success)
        throw new Error(`Pregunta inválida en ${filePath}:\n${z.prettifyError(parsed.error)}`);
      const pointIds = parsed.data.expectedPoints.map((p) => p.id);
      if (new Set(pointIds).size !== pointIds.length) throw new Error(`Criterios duplicados en ${filePath}.`);
      if (content.trim().length === 0) throw new Error(`${filePath} no tiene respuesta de referencia.`);
      questions.push({ ...parsed.data, area, slug: file.replace(/\.md$/, ""), strongAnswer: content });
    }
  }
  const ids = new Set<string>();
  for (const q of questions) {
    if (ids.has(q.id)) throw new Error(`ID de pregunta duplicado: ${q.id}`);
    ids.add(q.id);
  }
  return questions;
}
