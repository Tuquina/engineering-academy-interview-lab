import { describe, expect, it, vi } from "vitest";
import { buildMentorSystemPrompt, trimHistory } from "../domain/mentor";
import { askMentor, mentorRequestSchema, type MentorModel } from "./ask-mentor";

describe("AI Study Mentor", () => {
  it("sólo incluye el contexto que la persona autorizó", () => {
    const without = buildMentorSystemPrompt("hint", {});
    expect(without).toContain("enseñá antes de revelar soluciones completas");
    expect(without).not.toContain("Contexto de la lección");
    const withLesson = buildMentorSystemPrompt("hint", {
      lesson: { title: "Event loop", description: "d", objectives: ["o"], summary: ["s"] },
    });
    expect(withLesson).toContain("Título: Event loop");
  });

  it("recorta la historia empezando por un mensaje de la persona", () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      text: `m${i}`,
    }));
    const trimmed = trimHistory(messages);
    expect(trimmed[0]!.role).toBe("user");
    expect(trimmed.length).toBeLessThanOrEqual(12);
  });

  it("valida la solicitud y consulta al modelo con el prompt del modo", async () => {
    const model: MentorModel = { complete: vi.fn().mockResolvedValue({ text: "respuesta", usage: null }) };
    const request = mentorRequestSchema.parse({
      mode: "explain",
      messages: [{ role: "user", text: "¿Qué es CQRS?" }],
    });
    await expect(askMentor(request, model)).resolves.toEqual({ text: "respuesta", usage: null });
    expect(vi.mocked(model.complete).mock.calls[0]![0].system).toContain("Modo: Explicar un concepto");
    expect(mentorRequestSchema.safeParse({ mode: "otro", messages: [] }).success).toBe(false);
  });
});
