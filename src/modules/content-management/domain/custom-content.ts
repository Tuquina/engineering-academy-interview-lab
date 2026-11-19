/**
 * Contenido personalizado creado desde la administración (MASTER_PROMPT §8.3, §8.4 y §27).
 *
 * Se guarda como **datos estructurados**, nunca como MDX: una lección es una lista de bloques de tipos conocidos
 * (párrafo, código, aviso, diagrama, pregunta…) que la interfaz renderiza con componentes controlados. Así un texto
 * cargado desde la web no puede ejecutar código en el servidor ni en el navegador.
 */

export type Difficulty = "basic" | "intermediate" | "advanced";
export type ContentStatus = "draft" | "published";
export type CalloutTone = "info" | "tip" | "warning" | "danger" | "interview";

export type Block =
  | { readonly id: string; readonly type: "heading"; readonly text: string }
  | { readonly id: string; readonly type: "paragraph"; readonly text: string }
  | {
      readonly id: string;
      readonly type: "list";
      readonly ordered: boolean;
      readonly items: readonly string[];
    }
  | { readonly id: string; readonly type: "code"; readonly language: CodeLanguage; readonly code: string }
  | {
      readonly id: string;
      readonly type: "callout";
      readonly tone: CalloutTone;
      readonly title: string;
      readonly text: string;
    }
  | { readonly id: string; readonly type: "diagram"; readonly chart: string; readonly caption: string }
  | {
      readonly id: string;
      readonly type: "question";
      readonly question: string;
      readonly options: readonly {
        readonly text: string;
        readonly correct: boolean;
        readonly explanation: string;
      }[];
    };

export type BlockType = Block["type"];

export const CODE_LANGUAGES = ["ts", "tsx", "js", "json", "csharp", "java", "bash", "sql", "text"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Título de sección",
  paragraph: "Párrafo",
  list: "Lista",
  code: "Código",
  callout: "Aviso",
  diagram: "Diagrama (Mermaid)",
  question: "Pregunta autocorregible",
};

export interface CourseModule {
  readonly id: string;
  readonly title: string;
}

export interface CustomLesson {
  readonly id: string;
  readonly moduleId: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: Difficulty;
  readonly estimatedMinutes: number;
  readonly objectives: readonly string[];
  readonly tags: readonly string[];
  readonly prerequisites: readonly string[];
  readonly blocks: readonly Block[];
  readonly summary: readonly string[];
  readonly references: readonly { readonly title: string; readonly url: string }[];
  readonly interviewQuestions: readonly {
    readonly question: string;
    readonly keyPoints: readonly string[];
  }[];
  readonly status: ContentStatus;
}

export interface Flashcard {
  readonly id: string;
  readonly front: string;
  readonly back: string;
}

export interface CustomCourse {
  readonly id: string;
  readonly slug: string;
  readonly areaId: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: Difficulty;
  readonly modules: readonly CourseModule[];
  readonly prerequisites: readonly string[];
  readonly status: ContentStatus;
  readonly version: number;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  /** En orden de presentación. */
  readonly lessons: readonly CustomLesson[];
  readonly flashcards: readonly Flashcard[];
}

export interface CourseSummary {
  readonly id: string;
  readonly slug: string;
  readonly areaId: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: Difficulty;
  readonly status: ContentStatus;
  readonly version: number;
  readonly lessonCount: number;
  readonly updatedAt: string;
}

/**
 * IDs estables para el progreso y las preguntas: dependen del UUID, no del slug, así renombrar una lección no pierde
 * el progreso de nadie. El prefijo `custom.` evita choques con el contenido del repositorio.
 */
export const customLessonId = (lessonId: string) => `custom.${lessonId}`;
export const customQuestionId = (lessonId: string, blockId: string) => `custom.${lessonId}.${blockId}`;
export const customCourseId = (courseId: string) => `custom.${courseId}`;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface IntegrityContext {
  readonly areaIds: ReadonlySet<string>;
  /** IDs de lecciones existentes: las del repositorio y las personalizadas (`custom.<uuid>`). */
  readonly lessonIds: ReadonlySet<string>;
  /** IDs de cursos existentes: los del repositorio y los personalizados (`custom.<uuid>`). */
  readonly courseIds: ReadonlySet<string>;
}

export interface IntegrityIssue {
  readonly path: string;
  readonly message: string;
  /** `error` impide publicar; `warning` sólo avisa. */
  readonly severity: "error" | "warning";
}

/**
 * Validaciones que evitan referencias rotas antes de guardar o publicar (MASTER_PROMPT §8.4): área existente,
 * módulos y slugs únicos, lecciones en módulos que existen, prerrequisitos que existen y preguntas bien formadas.
 */
export function checkIntegrity(course: CustomCourse, ctx: IntegrityContext): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const error = (path: string, message: string) => issues.push({ path, message, severity: "error" });
  const warning = (path: string, message: string) => issues.push({ path, message, severity: "warning" });

  if (!ctx.areaIds.has(course.areaId)) error("areaId", `El área "${course.areaId}" no existe.`);
  if (!SLUG_PATTERN.test(course.slug))
    error("slug", "El slug del curso sólo admite minúsculas, números y guiones.");
  const moduleIds = new Set<string>();
  for (const mod of course.modules) {
    if (moduleIds.has(mod.id)) error(`modules.${mod.id}`, `El módulo "${mod.id}" está repetido.`);
    moduleIds.add(mod.id);
  }
  for (const prerequisite of course.prerequisites) {
    if (!ctx.courseIds.has(prerequisite) && !ctx.lessonIds.has(prerequisite)) {
      error("prerequisites", `El prerrequisito "${prerequisite}" no existe.`);
    }
  }
  const slugs = new Set<string>();
  const ownIds = new Set(course.lessons.map((l) => customLessonId(l.id)));
  for (const [index, lesson] of course.lessons.entries()) {
    const at = `lessons.${index}`;
    if (!SLUG_PATTERN.test(lesson.slug)) error(`${at}.slug`, `"${lesson.title}": slug inválido.`);
    if (slugs.has(lesson.slug)) error(`${at}.slug`, `El slug "${lesson.slug}" está repetido.`);
    slugs.add(lesson.slug);
    if (!moduleIds.has(lesson.moduleId))
      error(`${at}.moduleId`, `"${lesson.title}" está en un módulo que no existe.`);
    for (const prerequisite of lesson.prerequisites) {
      if (prerequisite === customLessonId(lesson.id))
        error(`${at}.prerequisites`, `"${lesson.title}" no puede requerirse a sí misma.`);
      else if (!ctx.lessonIds.has(prerequisite) && !ownIds.has(prerequisite)) {
        error(`${at}.prerequisites`, `"${lesson.title}": el prerrequisito "${prerequisite}" no existe.`);
      }
    }
    const blockIds = new Set<string>();
    for (const block of lesson.blocks) {
      if (blockIds.has(block.id)) error(`${at}.blocks`, `"${lesson.title}": bloques con id repetido.`);
      blockIds.add(block.id);
      if (block.type === "question") {
        const correct = block.options.filter((o) => o.correct).length;
        if (block.options.length < 2)
          error(
            `${at}.blocks.${block.id}`,
            `"${lesson.title}": una pregunta necesita al menos dos opciones.`,
          );
        if (correct !== 1)
          error(
            `${at}.blocks.${block.id}`,
            `"${lesson.title}": cada pregunta debe tener exactamente una opción correcta.`,
          );
      }
    }
    if (lesson.blocks.length === 0) warning(`${at}.blocks`, `"${lesson.title}" no tiene contenido.`);
    if (lesson.objectives.length === 0)
      warning(`${at}.objectives`, `"${lesson.title}" no declara objetivos.`);
  }
  if (course.status === "published" && !course.lessons.some((l) => l.status === "published")) {
    warning("lessons", "El curso está publicado pero no tiene lecciones publicadas.");
  }
  return issues;
}

export function hasBlockingIssues(issues: readonly IntegrityIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/** Lecciones visibles para el público: el curso y la lección deben estar publicados. */
export function publishedLessons(course: CustomCourse): CustomLesson[] {
  return course.status === "published" ? course.lessons.filter((l) => l.status === "published") : [];
}
