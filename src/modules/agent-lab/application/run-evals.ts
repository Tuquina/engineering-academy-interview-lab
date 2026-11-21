import type { AgentConfig } from "../domain/agent-config";
import { LAB_TODAY, SEED_WORLD, customerSnapshot, type SupportWorld } from "../domain/support-world";
import type { ChatMessage, ToolCallTrace } from "../domain/conversation";
import {
  casePassed,
  evaluateChecks,
  type CaseRun,
  type CheckResult,
  type EvalCase,
  type TokenUsage,
} from "../domain/evaluation";
import type { MemoryFact } from "../domain/memory";
import { hashString } from "../domain/random";
import type { LlmProvider } from "./llm-provider";
import { runAgentTurn } from "./run-agent-turn";

/**
 * Puerto del evaluador "LLM as Judge": un modelo lee la conversación y decide si cumple una rúbrica.
 * Su veredicto es probabilístico y se reporta separado de las verificaciones deterministas.
 */
export interface Judge {
  readonly id: string;
  judge(input: { rubric: string; transcript: string }): Promise<{ passed: boolean; reasoning: string }>;
}

export interface RunCaseInput {
  readonly config: AgentConfig;
  readonly evalCase: EvalCase;
  readonly provider: LlmProvider;
  readonly fallbackProvider?: LlmProvider;
  readonly repetition: number;
  readonly baseSeed: number;
  readonly judge?: Judge;
  readonly world?: SupportWorld;
  readonly clock?: () => number;
}

/**
 * Semilla de una repetición: depende del caso y del número de repetición, no de la versión del agente. Así la
 * repetición N de un caso usa la misma semilla en la versión A y en la B (comparación pareada).
 */
export function repetitionSeed(baseSeed: number, caseId: string, repetition: number): number {
  return hashString(`${baseSeed}|${caseId}|${repetition}`);
}

function addUsage(total: TokenUsage | null, turn: TokenUsage | null): TokenUsage | null {
  if (!turn) return total;
  return {
    inputTokens: (total?.inputTokens ?? 0) + turn.inputTokens,
    outputTokens: (total?.outputTokens ?? 0) + turn.outputTokens,
  };
}

/** Ejecuta un caso completo (todas sus vueltas) desde el mundo inicial y lo evalúa. */
export async function runEvalCase(input: RunCaseInput): Promise<CaseRun> {
  const { config, evalCase } = input;
  const seed = repetitionSeed(input.baseSeed, evalCase.id, input.repetition);
  const today = evalCase.today ?? LAB_TODAY;
  const initialWorld = input.world ?? SEED_WORLD;
  let world = initialWorld;
  let memory: readonly MemoryFact[] = evalCase.memory ?? [];
  let history: ChatMessage[] = [];
  const replies: string[] = [];
  const toolCalls: ToolCallTrace[] = [];
  let latencyMs = 0;
  let usage: TokenUsage | null = null;
  let error: string | null = null;

  for (const [index, message] of evalCase.turns.entries()) {
    const result = await runAgentTurn({
      config,
      provider: input.provider,
      fallbackProvider: input.fallbackProvider,
      history,
      userMessage: message,
      world,
      memory,
      customerId: evalCase.customerId,
      today,
      seed: seed + index,
      clock: input.clock,
    });
    history = [...history, ...result.newMessages];
    world = result.world;
    memory = result.memory;
    replies.push(result.reply);
    toolCalls.push(...result.toolCalls);
    latencyMs += result.latencyMs;
    usage = addUsage(usage, result.usage);
    if (result.outcome !== "answered") {
      error = result.error ?? `El turno terminó con estado ${result.outcome}.`;
      break;
    }
  }

  let checks: CheckResult[] = evaluateChecks(evalCase.checks, {
    replies,
    toolCalls,
    initialState: customerSnapshot(initialWorld, evalCase.customerId),
    finalState: customerSnapshot(world, evalCase.customerId),
    world,
    customerId: evalCase.customerId,
    policies: config.policies,
  });

  if (input.judge && checks.some((c) => c.check.type === "judge")) {
    const transcript = evalCase.turns
      .map((turn, i) => `Persona: ${turn}\nAgente: ${replies[i] ?? "(sin respuesta)"}`)
      .join("\n\n");
    checks = await Promise.all(
      checks.map(async (c) => {
        if (c.check.type !== "judge") return c;
        try {
          const verdict = await input.judge!.judge({ rubric: c.check.rubric, transcript });
          return {
            ...c,
            status: verdict.passed ? ("passed" as const) : ("failed" as const),
            detail: verdict.reasoning,
          };
        } catch (cause) {
          return { ...c, status: "skipped" as const, detail: `El juez falló: ${String(cause)}` };
        }
      }),
    );
  }

  return {
    caseId: evalCase.id,
    repetition: input.repetition,
    seed,
    passed: casePassed(checks, error),
    checks,
    replies,
    toolCalls: toolCalls.map((t) => ({ name: t.name, status: t.status, input: t.input })),
    latencyMs,
    usage,
    error,
  };
}

export interface RunSuiteInput extends Omit<RunCaseInput, "evalCase" | "repetition"> {
  readonly cases: readonly EvalCase[];
  readonly repetitions: number;
  readonly onProgress?: (done: number, total: number) => void;
  readonly signal?: AbortSignal;
}

/** Ejecuta la suite completa: cada caso, `repetitions` veces, con semillas reproducibles. */
export async function runEvalSuite(input: RunSuiteInput): Promise<CaseRun[]> {
  const runs: CaseRun[] = [];
  const total = input.cases.length * input.repetitions;
  for (const evalCase of input.cases) {
    for (let repetition = 0; repetition < input.repetitions; repetition++) {
      if (input.signal?.aborted) return runs;
      runs.push(await runEvalCase({ ...input, evalCase, repetition }));
      input.onProgress?.(runs.length, total);
    }
  }
  return runs;
}
