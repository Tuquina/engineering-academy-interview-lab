import type Anthropic from "@anthropic-ai/sdk";
import type { MentorModel } from "../application/ask-mentor";
import type { MentorMessage } from "../domain/mentor";

/** Adaptador de servidor del mentor sobre la API de Anthropic (texto, sin herramientas). */
export class AnthropicMentorModel implements MentorModel {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  async complete(input: { system: string; messages: readonly MentorMessage[]; maxTokens: number }) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: input.messages.map((m) => ({ role: m.role, content: m.text })),
    });
    if (response.stop_reason === "refusal") {
      return { text: "El modelo no respondió esta consulta. Probá reformularla.", usage: null };
    }
    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("\n")
      .trim();
    return {
      text: text || "(sin respuesta)",
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }
}
