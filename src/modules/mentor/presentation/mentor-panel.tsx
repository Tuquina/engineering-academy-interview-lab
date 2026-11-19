"use client";

import { GraduationCap, Loader2, Lock, Send } from "lucide-react";
import { useState } from "react";
import { useProgressState } from "@/modules/progress/presentation/progress-context";
import { useAiStatus } from "@/shared/lib/ai-status";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  MENTOR_LIMITS,
  MENTOR_MODES,
  type MentorContext,
  type MentorMessage,
  type MentorModeId,
} from "../domain/mentor";

export interface MentorLessonContext {
  readonly lessonId: string;
  readonly title: string;
  readonly description: string;
  readonly objectives: readonly string[];
  readonly summary: readonly string[];
}

/** Límite de mensajes por sesión del panel: control de costos además de los límites del servidor. */
const MAX_MESSAGES_PER_SESSION = 30;

/**
 * Panel del AI Study Mentor (MASTER_PROMPT §30). Sin proveedor configurado se muestra deshabilitado y explica cómo
 * habilitarlo; el resto de la plataforma no depende de él. El contexto de la lección y el progreso sólo se envían si
 * la persona lo autoriza explícitamente.
 */
export function MentorPanel({
  lesson,
  defaultMode = "lesson_question",
}: {
  lesson?: MentorLessonContext;
  defaultMode?: MentorModeId;
}) {
  const ai = useAiStatus();
  const progress = useProgressState();
  const [mode, setMode] = useState<MentorModeId>(lesson ? defaultMode : "explain");
  const [shareLesson, setShareLesson] = useState(false);
  const [shareProgress, setShareProgress] = useState(false);
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);

  if (!ai.enabled) {
    return (
      <div
        className="border-border bg-surface-2/40 text-muted flex items-start gap-3 rounded-lg border p-4 text-sm"
        data-testid="mentor-disabled"
      >
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong className="text-foreground">AI Study Mentor (opcional) deshabilitado.</strong> Necesita un
          proveedor LLM configurado en el servidor (<code>ANTHROPIC_API_KEY</code>, ver README). Todo lo
          demás, incluidos los laboratorios deterministas, funciona sin él.
        </p>
      </div>
    );
  }

  const buildContext = (): MentorContext => {
    const context: { lesson?: MentorContext["lesson"]; progress?: MentorContext["progress"] } = {};
    if (lesson && shareLesson) {
      context.lesson = {
        title: lesson.title,
        description: lesson.description,
        objectives: lesson.objectives,
        summary: lesson.summary,
      };
    }
    if (shareProgress) {
      const questions = Object.values(progress.questions);
      const attempts = questions.reduce((n, q) => n + q.attempts, 0);
      context.progress = {
        completedLessons: Object.values(progress.lessons).filter((l) => l.status === "completed").length,
        currentLessonStatus: lesson
          ? (progress.lessons[lesson.lessonId]?.status ?? "not_started")
          : "sin lección",
        answeredQuestions: questions.length,
        correctRate: attempts ? questions.reduce((n, q) => n + q.correctAttempts, 0) / attempts : null,
      };
    }
    return context;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (messages.length >= MAX_MESSAGES_PER_SESSION) {
      setError(
        `Se alcanzó el máximo de ${MAX_MESSAGES_PER_SESSION} mensajes de esta sesión. Recargá para empezar otra.`,
      );
      return;
    }
    const next = [...messages, { role: "user" as const, text: text.slice(0, MENTOR_LIMITS.maxMessageChars) }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, messages: next, context: buildContext() }),
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        usage?: { inputTokens: number; outputTokens: number } | null;
      };
      if (!response.ok || !data.text) throw new Error(data.error ?? `HTTP ${response.status}`);
      setMessages([...next, { role: "assistant", text: data.text }]);
      if (data.usage) setTokens((t) => t + data.usage!.inputTokens + data.usage!.outputTokens);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setMessages(messages);
      setInput(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-border bg-surface space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <GraduationCap aria-hidden className="text-accent size-5" />
        <h2 className="text-foreground font-semibold">AI Study Mentor</h2>
        <span className="text-muted text-xs">
          Modelo real: {ai.model} · {tokens} tokens en esta sesión
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de ayuda">
        {MENTOR_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs",
              mode === m.id
                ? "bg-accent/20 text-accent border-accent/40"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="text-foreground flex flex-wrap gap-4 text-sm">
        {lesson ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={shareLesson} onChange={(e) => setShareLesson(e.target.checked)} />
            Compartir el contexto de esta lección
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shareProgress}
            onChange={(e) => setShareProgress(e.target.checked)}
          />
          Compartir mi progreso (resumen numérico)
        </label>
      </div>
      {messages.length ? (
        <ol
          className="max-h-96 space-y-2 overflow-y-auto"
          aria-live="polite"
          aria-label="Conversación con el mentor"
        >
          {messages.map((m, i) => (
            <li
              key={i}
              className={cn(
                "rounded-md px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-accent/10 text-foreground ml-8" : "bg-surface-2 text-foreground mr-8",
              )}
            >
              <span className="sr-only">{m.role === "user" ? "Vos: " : "Mentor: "}</span>
              {m.text}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted text-xs">
          El mentor intenta enseñar antes de dar soluciones completas. Respuestas generadas por un modelo:
          verificalas.
        </p>
      )}
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="mentor-input" className="sr-only">
          Pregunta para el mentor
        </label>
        <textarea
          id="mentor-input"
          value={input}
          maxLength={MENTOR_LIMITS.maxMessageChars}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí tu duda, pegá un error o tu código…"
          className="border-border bg-surface-2 text-foreground min-h-16 min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={busy || !input.trim()} className="self-end">
          {busy ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />} Enviar
        </Button>
      </form>
    </div>
  );
}
