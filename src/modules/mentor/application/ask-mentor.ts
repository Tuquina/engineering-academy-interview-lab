import { z } from "zod";
import {
  MENTOR_LIMITS,
  MENTOR_MODES,
  buildMentorSystemPrompt,
  trimHistory,
  type MentorContext,
  type MentorMessage,
  type MentorModeId,
} from "../domain/mentor";

/** Puerto hacia el modelo que responde como mentor (sin herramientas). */
export interface MentorModel {
  complete(input: {
    system: string;
    messages: readonly MentorMessage[];
    maxTokens: number;
  }): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } | null }>;
}

const text = (max: number) => z.string().max(max);

export const mentorRequestSchema = z.object({
  mode: z.enum(MENTOR_MODES.map((m) => m.id) as [MentorModeId, ...MentorModeId[]]),
  messages: z
    .array(
      z.object({ role: z.enum(["user", "assistant"]), text: text(MENTOR_LIMITS.maxMessageChars * 2).min(1) }),
    )
    .min(1)
    .max(40),
  context: z
    .object({
      lesson: z
        .object({
          title: text(200),
          description: text(600),
          objectives: z.array(text(300)).max(12),
          summary: z.array(text(400)).max(12),
        })
        .optional(),
      progress: z
        .object({
          completedLessons: z.number().int().min(0).max(10_000),
          currentLessonStatus: text(40),
          answeredQuestions: z.number().int().min(0).max(100_000),
          correctRate: z.number().min(0).max(1).nullable(),
        })
        .optional(),
    })
    .default({}),
});

export type MentorRequest = z.infer<typeof mentorRequestSchema>;

/** Caso de uso: arma el prompt con el modo y el contexto autorizado, recorta la historia y consulta al modelo. */
export async function askMentor(request: MentorRequest, model: MentorModel) {
  const history = trimHistory(request.messages);
  const last = history.at(-1);
  if (!last || last.role !== "user") throw new Error("El último mensaje debe ser de la persona.");
  if (last.text.length > MENTOR_LIMITS.maxMessageChars) {
    throw new Error(`El mensaje supera ${MENTOR_LIMITS.maxMessageChars} caracteres.`);
  }
  const system = buildMentorSystemPrompt(request.mode, request.context as MentorContext);
  return model.complete({ system, messages: history, maxTokens: MENTOR_LIMITS.maxOutputTokens });
}
