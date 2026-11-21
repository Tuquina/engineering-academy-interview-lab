/**
 * AI Study Mentor (MASTER_PROMPT §30): un tutor que enseña antes de dar soluciones.
 *
 * El dominio define los modos de ayuda, los límites y cómo se arma el prompt con el contexto que el usuario autoriza
 * compartir (la lección actual y su progreso). No conoce ningún proveedor de modelos.
 */

export const MENTOR_MODES = [
  {
    id: "explain",
    label: "Explicar un concepto",
    instruction:
      "Explicá el concepto desde lo básico, con un ejemplo concreto de un dominio realista (comercio, reservas, pagos, salud, logística) y una analogía si ayuda.",
  },
  {
    id: "lesson_question",
    label: "Duda sobre la lección",
    instruction:
      "Respondé la duda usando el contexto de la lección cuando exista; si la lección no lo cubre, decilo.",
  },
  {
    id: "follow_up",
    label: "Preguntas de seguimiento",
    instruction: "Proponé 3 preguntas de seguimiento de dificultad creciente, sin las respuestas.",
  },
  {
    id: "hint",
    label: "Dame una pista",
    instruction:
      "Da una sola pista que acerque a la solución sin revelarla. Si piden más, la siguiente pista es un poco más concreta.",
  },
  {
    id: "explain_error",
    label: "Explicar un error",
    instruction:
      "Explicá qué significa el error, la causa más probable y cómo verificarla. Guiá a la corrección en lugar de escribirla completa.",
  },
  {
    id: "mock_interview",
    label: "Simular entrevista",
    instruction:
      "Actuá como entrevistador técnico: hacé una pregunta por vez, esperá la respuesta y repreguntá. Al final, devolución con fortalezas y aspectos a mejorar.",
  },
  {
    id: "compare_architectures",
    label: "Comparar alternativas",
    instruction:
      "Compará las alternativas con una tabla de compromisos (consistencia, costo, complejidad, operación) y decí cuándo conviene cada una.",
  },
  {
    id: "extra_exercises",
    label: "Proponer ejercicios",
    instruction: "Proponé 2 o 3 ejercicios graduados con su objetivo de aprendizaje, sin la solución.",
  },
  {
    id: "review_code",
    label: "Analizar mi código",
    instruction:
      "Revisá el código: corrección, casos borde, legibilidad y rendimiento. Señalá problemas con preguntas guía antes de dar la versión corregida.",
  },
] as const;

export type MentorModeId = (typeof MENTOR_MODES)[number]["id"];

export interface MentorMessage {
  readonly role: "user" | "assistant";
  readonly text: string;
}

/** Contexto que el usuario autorizó compartir. Nada de esto se envía si no lo marca. */
export interface MentorContext {
  readonly lesson?: {
    readonly title: string;
    readonly description: string;
    readonly objectives: readonly string[];
    readonly summary: readonly string[];
  };
  readonly progress?: {
    readonly completedLessons: number;
    readonly currentLessonStatus: string;
    readonly answeredQuestions: number;
    readonly correctRate: number | null;
  };
}

export const MENTOR_LIMITS = {
  maxMessageChars: 4_000,
  maxHistoryMessages: 12,
  maxOutputTokens: 1_200,
} as const;

export function findMode(id: string) {
  return MENTOR_MODES.find((m) => m.id === id);
}

export function buildMentorSystemPrompt(mode: MentorModeId, context: MentorContext): string {
  const selected = findMode(mode)!;
  const parts = [
    "Sos el AI Study Mentor de una academia para preparar búsquedas laborales y entrevistas técnicas de ingeniería " +
      "de software (TypeScript, Node.js, React, Next.js, PostgreSQL, Redis, arquitectura, System Design y agentes LLM).",
    "Respondé en español rioplatense, claro y concreto. La persona ya sabe programar; adaptá las comparaciones al " +
      "lenguaje que mencione.",
    "Regla principal: enseñá antes de revelar soluciones completas. Primero preguntas guía y pistas; la solución " +
      "completa sólo si la persona la pide explícitamente después de intentarlo.",
    "Si no sabés algo o no está en el contexto, decilo. No inventes APIs ni resultados.",
    "No pidas ni aceptes credenciales. El código que propongas es para estudiar: la plataforma nunca lo ejecuta.",
    `Modo: ${selected.label}. ${selected.instruction}`,
  ];
  if (context.lesson) {
    parts.push(
      [
        "Contexto de la lección actual (compartido por la persona):",
        `Título: ${context.lesson.title}`,
        `Descripción: ${context.lesson.description}`,
        `Objetivos: ${context.lesson.objectives.join("; ")}`,
        `Puntos clave: ${context.lesson.summary.join("; ")}`,
      ].join("\n"),
    );
  }
  if (context.progress) {
    const p = context.progress;
    parts.push(
      `Progreso (compartido por la persona): ${p.completedLessons} lecciones completadas; esta lección: ` +
        `${p.currentLessonStatus}; ${p.answeredQuestions} preguntas respondidas` +
        (p.correctRate === null ? "." : ` con ${Math.round(p.correctRate * 100)} % de acierto.`) +
        " Ajustá la profundidad a ese nivel.",
    );
  }
  return parts.join("\n\n");
}

/** Recorta la historia a los últimos mensajes, empezando por uno del usuario. */
export function trimHistory(messages: readonly MentorMessage[]): MentorMessage[] {
  const recent = messages.slice(-MENTOR_LIMITS.maxHistoryMessages);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}
