/**
 * Tipos del catálogo educativo. Son datos inmutables e independientes del formato de origen
 * (archivos, base de datos, importación JSON).
 */

/** Nivel de dificultad de un curso o lección. */
export type Difficulty = "basic" | "intermediate" | "advanced";

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  basic: "Básico",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

/** Lenguajes con los que una lección puede compararse explícitamente. */
export type ComparedLanguage = "csharp" | "java";

/** Área de conocimiento: agrupador de primer nivel (p. ej. "Frontend", "IA y agentes"). */
export interface KnowledgeArea {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
}

/** Módulo dentro de un curso. `topics` es el temario planificado, exista o no una lección para cada tema. */
export interface CourseModule {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
  readonly topics: readonly string[];
}

export interface Course {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly areaId: string;
  readonly difficulty: Difficulty;
  readonly order: number;
  /** IDs de cursos que conviene completar antes. */
  readonly prerequisites: readonly string[];
  readonly tags: readonly string[];
  readonly modules: readonly CourseModule[];
}

export interface Reference {
  readonly title: string;
  readonly url: string;
}

/** Pregunta de entrevista asociada a una lección, con los puntos que una respuesta sólida debería cubrir. */
export interface InterviewQuestionRef {
  readonly question: string;
  readonly keyPoints: readonly string[];
}

/** Metadatos de una lección (el cuerpo MDX se carga por separado y sólo cuando se necesita). */
export interface LessonMeta {
  readonly id: string;
  readonly slug: string;
  readonly courseId: string;
  readonly moduleId: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: Difficulty;
  readonly order: number;
  readonly objectives: readonly string[];
  /** IDs de lecciones previas recomendadas. */
  readonly prerequisites: readonly string[];
  readonly estimatedMinutes: number;
  readonly tags: readonly string[];
  /** Versión semántica del contenido; cambia cuando la lección se revisa de forma sustancial. */
  readonly version: string;
  readonly references: readonly Reference[];
  readonly relatedExercises: readonly string[];
  readonly relatedChallenges: readonly string[];
  readonly interviewQuestions: readonly InterviewQuestionRef[];
  readonly diagrams: readonly string[];
  readonly summary: readonly string[];
  readonly comparesWith: readonly ComparedLanguage[];
}

/** Elemento de una etapa de ruta: una lección concreta o un curso completo (que se expande a sus lecciones). */
export type PathItem =
  | { readonly kind: "lesson"; readonly lessonId: string }
  | { readonly kind: "course"; readonly courseId: string };

export interface PathStage {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly goals: readonly string[];
  readonly items: readonly PathItem[];
}

export interface LearningPath {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly audience: string;
  readonly order: number;
  readonly stages: readonly PathStage[];
}

/** Datos crudos del catálogo, tal como los entrega una fuente de contenido. */
export interface CatalogData {
  readonly areas: readonly KnowledgeArea[];
  readonly courses: readonly Course[];
  readonly lessons: readonly LessonMeta[];
  readonly paths: readonly LearningPath[];
}
