import { z } from "zod";

/**
 * Esquemas de validación de los archivos de `content/`. Son el contrato público para autores de contenido:
 * se usan objetos estrictos para que un campo mal escrito falle en lugar de ignorarse silenciosamente.
 */

const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, "Usar minúsculas, números, '-' y '.'");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usar minúsculas, números y '-'");
const text = z.string().trim().min(1);
const difficulty = z.enum(["basic", "intermediate", "advanced"]);
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, "Versión semántica (p. ej. 1.0.0)");

export const areasFileSchema = z.array(
  z.strictObject({
    id,
    slug,
    title: text,
    description: text,
    order: z.number().int(),
  }),
);

export const courseFileSchema = z.strictObject({
  id,
  slug,
  title: text,
  description: text,
  areaId: id,
  difficulty,
  order: z.number().int(),
  prerequisites: z.array(id).default([]),
  tags: z.array(text).default([]),
  modules: z
    .array(
      z.strictObject({
        id,
        slug,
        title: text,
        description: text,
        order: z.number().int(),
        topics: z.array(text).default([]),
      }),
    )
    .min(1),
});

export const lessonFrontmatterSchema = z.strictObject({
  id,
  moduleId: id,
  title: text,
  description: text,
  difficulty,
  order: z.number().int(),
  objectives: z.array(text).min(1),
  prerequisites: z.array(id).default([]),
  estimatedMinutes: z.number().int().positive(),
  tags: z.array(text).default([]),
  version: semver,
  references: z.array(z.strictObject({ title: text, url: z.url({ protocol: /^https$/ }) })).default([]),
  relatedExercises: z.array(id).default([]),
  relatedChallenges: z.array(id).default([]),
  interviewQuestions: z
    .array(z.strictObject({ question: text, keyPoints: z.array(text).min(1) }))
    .default([]),
  diagrams: z.array(id).default([]),
  summary: z.array(text).min(1),
  comparesWith: z.array(z.enum(["csharp", "java"])).default([]),
});

const pathItemSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("lesson"), lessonId: id }),
  z.strictObject({ kind: z.literal("course"), courseId: id }),
]);

export const pathFileSchema = z.strictObject({
  id,
  slug,
  title: text,
  description: text,
  audience: text,
  order: z.number().int(),
  stages: z
    .array(
      z.strictObject({
        id,
        title: text,
        description: text,
        goals: z.array(text).default([]),
        items: z.array(pathItemSchema).default([]),
      }),
    )
    .min(1),
});
