import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "../application/llm-provider";
import { toolDefinitions } from "../application/tool-schemas";
import { AnthropicLlmProvider, toProviderError } from "./anthropic-llm-provider";

/** Cliente falso: verifica el mapeo sin llamar a la API (los tests nunca gastan tokens). */
function fakeClient(response: unknown) {
  const create = vi.fn().mockResolvedValue(response);
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("AnthropicLlmProvider", () => {
  it("traduce herramientas, mensajes y respuesta, y conserva el contenido crudo para reenviarlo", async () => {
    const raw = [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "tool_use", id: "toolu_1", name: "get_order", input: { customerId: "c-001" } },
    ];
    const { client, create } = fakeClient({
      content: raw,
      stop_reason: "tool_use",
      usage: { input_tokens: 120, output_tokens: 30 },
    });
    const provider = new AnthropicLlmProvider(client, "claude-opus-5-5");
    const result = await provider.generate({
      system: "sistema",
      messages: [
        { role: "user", content: [{ type: "text", text: "¿Cuánto debo?" }] },
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "x", name: "get_order", input: {} }],
          providerContent: [
            { type: "thinking", thinking: "", signature: "prev" },
            { type: "tool_use", id: "x", name: "get_order", input: {} },
          ],
        },
        { role: "user", content: [{ type: "tool_result", toolUseId: "x", content: "{}", isError: false }] },
      ],
      tools: toolDefinitions(["get_order"]),
      model: "modelo-no-permitido",
      maxTokens: 10_000,
    });

    const params = create.mock.calls[0]![0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(2_048);
    expect(params.tools[0]).toMatchObject({ name: "get_order", strict: true });
    expect(params.tools[0].input_schema).toMatchObject({ type: "object", additionalProperties: false });
    expect(params.messages[1].content[0]).toMatchObject({ type: "thinking", signature: "prev" });
    expect(params.messages[2].content[0]).toEqual({
      type: "tool_result",
      tool_use_id: "x",
      content: "{}",
      is_error: false,
    });

    expect(result.stopReason).toBe("tool_use");
    expect(result.content).toEqual([
      { type: "tool_use", id: "toolu_1", name: "get_order", input: { customerId: "c-001" } },
    ]);
    expect(result.providerContent).toBe(raw);
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 30 });
  });

  it("marca como reintentables sólo los errores transitorios", () => {
    expect(toProviderError(new Anthropic.APIConnectionError({ message: "x" })).retryable).toBe(true);
    expect(toProviderError(new Error("otra cosa")).retryable).toBe(false);
    const own = new ProviderError("propio", true);
    expect(toProviderError(own)).toBe(own);
  });
});
