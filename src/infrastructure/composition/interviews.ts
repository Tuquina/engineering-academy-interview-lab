import path from "node:path";
import { cache } from "react";
import type { InterviewQuestion, QuestionData } from "@/modules/interviews/domain/question";
import { loadInterviewQuestions } from "@/modules/interviews/infrastructure/file-system-question-source";

let production: Promise<InterviewQuestion[]> | null = null;

/** Banco de preguntas del Interview Arena (cacheado por proceso en producción, releído en desarrollo). */
export const getInterviewQuestions = cache((): Promise<InterviewQuestion[]> => {
  const root = path.join(process.cwd(), "content");
  if (process.env.NODE_ENV !== "production") return loadInterviewQuestions(root);
  production ??= loadInterviewQuestions(root).catch((error: unknown) => {
    production = null;
    throw error;
  });
  return production;
});

export function toQuestionData(question: InterviewQuestion): QuestionData {
  const { strongAnswer: _answer, ...data } = question;
  return data;
}
