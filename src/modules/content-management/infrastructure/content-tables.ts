import { sql } from "drizzle-orm";
import {
  bigserial,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../../auth/infrastructure/auth-tables";

/**
 * Contenido personalizado editable desde la administración (MASTER_PROMPT §27 y §28: CustomContent y
 * ContentVersions). El contenido del repositorio sigue en `content/`; estas tablas guardan sólo lo creado desde la web,
 * como datos estructurados (nunca MDX ejecutable).
 */

export const contentStatus = pgEnum("content_status", ["draft", "published"]);

export const customCourses = pgTable(
  "custom_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    areaId: text("area_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    difficulty: text("difficulty").notNull(),
    /** Módulos `{ id, title }` en orden. Pocos y siempre leídos con el curso: no justifican una tabla propia. */
    modules: jsonb("modules")
      .notNull()
      .default(sql`'[]'::jsonb`),
    prerequisites: text("prerequisites")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: contentStatus("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("custom_courses_status_idx").on(t.status),
    check("custom_courses_difficulty", sql`${t.difficulty} in ('basic', 'intermediate', 'advanced')`),
  ],
);

export const customLessons = pgTable(
  "custom_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => customCourses.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    slug: text("slug").notNull(),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    difficulty: text("difficulty").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    objectives: jsonb("objectives").notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    prerequisites: text("prerequisites")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Bloques estructurados (párrafo, código, aviso, diagrama, pregunta…), validados con Zod. */
    blocks: jsonb("blocks").notNull(),
    summary: jsonb("summary").notNull(),
    references: jsonb("references").notNull(),
    interviewQuestions: jsonb("interview_questions").notNull(),
    status: contentStatus("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("custom_lessons_course_slug").on(t.courseId, t.slug),
    index("custom_lessons_course_position").on(t.courseId, t.position),
  ],
);

export const customFlashcards = pgTable(
  "custom_flashcards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => customCourses.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("custom_flashcards_course_idx").on(t.courseId, t.position)],
);

/** Instantánea de cada versión guardada de un curso (con sus lecciones y flashcards): permite restaurar. */
export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => customCourses.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    note: text("note").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("content_versions_course_version").on(t.courseId, t.version)],
);

/** Auditoría de acciones administrativas: quién hizo qué y cuándo. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    details: jsonb("details")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);
