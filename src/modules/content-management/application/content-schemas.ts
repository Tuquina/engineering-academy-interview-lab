import { z } from "zod";
import { CODE_LANGUAGES, SLUG_PATTERN } from "../domain/custom-content";

/** Esquemas del contenido personalizado: lo que llega de la web nunca se guarda sin validar. */

const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);
const shortText = (max: number) => z.string().trim().min(1).max(max);
const difficulty = z.enum(["basic", "intermediate", "advanced"]);
const status = z.enum(["draft", "published"]);
const slug = z.string().min(1).max(80).regex(SLUG_PATTERN, "Sólo minúsculas, números y guiones.");
const reference = z.object({ title: shortText(200), url: z.url({ protocol: /^https$/ }).max(500) });

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("heading"), text: shortText(160) }),
  z.object({ id, type: z.literal("paragraph"), text: shortText(5_000) }),
  z.object({
    id,
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z.array(shortText(500)).min(1).max(30),
  }),
  z.object({
    id,
    type: z.literal("code"),
    language: z.enum(CODE_LANGUAGES),
    code: z.string().min(1).max(10_000),
  }),
  z.object({
    id,
    type: z.literal("callout"),
    tone: z.enum(["info", "tip", "warning", "danger", "interview"]),
    title: z.string().max(160),
    text: shortText(2_000),
  }),
  z.object({ id, type: z.literal("diagram"), chart: shortText(5_000), caption: z.string().max(300) }),
  z.object({
    id,
    type: z.literal("question"),
    question: shortText(500),
    options: z
      .array(z.object({ text: shortText(300), correct: z.boolean(), explanation: z.string().max(600) }))
      .min(2)
      .max(6),
  }),
]);

export const lessonSchema = z.object({
  id: z.uuid(),
  moduleId: id,
  slug,
  title: shortText(160),
  description: z.string().max(600),
  difficulty,
  estimatedMinutes: z.number().int().min(1).max(600),
  objectives: z.array(shortText(300)).max(12),
  tags: z.array(shortText(40)).max(12),
  prerequisites: z.array(z.string().max(120)).max(12),
  blocks: z.array(blockSchema).max(200),
  summary: z.array(shortText(400)).max(12),
  references: z.array(reference).max(20),
  interviewQuestions: z
    .array(z.object({ question: shortText(400), keyPoints: z.array(shortText(300)).max(8) }))
    .max(12),
  status,
});

export const flashcardSchema = z.object({ id: z.uuid(), front: shortText(500), back: shortText(1_500) });

/** Documento completo de un curso tal como lo guarda el editor (con optimistic locking por `version`). */
export const courseDocumentSchema = z.object({
  slug,
  areaId: z.string().min(1).max(60),
  title: shortText(160),
  description: z.string().max(1_000),
  difficulty,
  modules: z
    .array(z.object({ id, title: shortText(160) }))
    .min(1)
    .max(30),
  prerequisites: z.array(z.string().max(120)).max(12),
  lessons: z.array(lessonSchema).max(200),
  flashcards: z.array(flashcardSchema).max(500),
});

export type CourseDocument = z.infer<typeof courseDocumentSchema>;

export const createCourseSchema = z.object({
  title: shortText(160),
  areaId: z.string().min(1).max(60),
  slug: slug.optional(),
});

export const saveCourseSchema = z.object({
  expectedVersion: z.number().int().min(1),
  note: z.string().max(200).default(""),
  course: courseDocumentSchema,
});

export const statusSchema = z.object({ status, expectedVersion: z.number().int().min(1) });

/** Formato de intercambio (import/export): sin UUIDs de la base, con slugs como identificadores legibles. */
export const CONTENT_FORMAT = "eal-content";
export const CONTENT_FORMAT_VERSION = 1;

const exportedLesson = lessonSchema
  .omit({ id: true })
  .extend({ prerequisites: z.array(z.string().max(120)).max(12) });

export const contentFileSchema = z.object({
  format: z.literal(CONTENT_FORMAT),
  version: z.literal(CONTENT_FORMAT_VERSION),
  exportedAt: z.string(),
  courses: z
    .array(
      courseDocumentSchema.omit({ lessons: true, flashcards: true }).extend({
        status,
        lessons: z.array(exportedLesson).max(200),
        flashcards: z.array(z.object({ front: shortText(500), back: shortText(1_500) })).max(500),
      }),
    )
    .max(50),
});

export type ContentFile = z.infer<typeof contentFileSchema>;

export const importSchema = z.object({
  /** `skip`: no toca cursos con el mismo slug. `replace`: los actualiza (guardando una versión). */
  mode: z.enum(["skip", "replace"]),
  file: contentFileSchema,
});
