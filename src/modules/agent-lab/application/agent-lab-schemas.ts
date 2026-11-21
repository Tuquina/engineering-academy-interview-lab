import { z } from "zod";
import { TOOL_NAMES } from "../domain/agent-config";
import { AGENT_LAB_SCHEMA_VERSION, type AgentLabState } from "../domain/agent-lab-state";
import { CONCEPTS } from "../domain/evaluation";

/** Esquemas de validación del estado persistido del AI Agents Lab. Lo leído del almacenamiento nunca se asume válido. */

const toolName = z.enum(TOOL_NAMES);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const agentConfigSchema = z.object({
  identity: z.object({
    agentName: z.string().max(60),
    companyName: z.string().max(80),
    role: z.string().max(120),
    tone: z.enum(["formal", "friendly", "neutral"]),
  }),
  voice: z.object({
    enabled: z.boolean(),
    voiceId: z.string().max(60),
    speakingRate: z.number().min(0.5).max(2),
    style: z.enum(["calm", "warm", "energetic"]),
  }),
  systemPrompt: z.string().max(8_000),
  objective: z.string().max(1_000),
  tools: z.array(toolName),
  rules: z.array(z.string().max(500)).max(30),
  policies: z.object({
    discloseAiIdentity: z.boolean(),
    maxPickupDays: z.number().int(),
    returnWindowDays: z.number().int(),
    maxCouponPercent: z.number(),
    contactHourStart: z.number().int(),
    contactHourEnd: z.number().int(),
    escalateOnDispute: z.boolean(),
    forbiddenPhrases: z.array(z.string().max(80)).max(30),
  }),
  variables: z.record(z.string().max(40), z.string().max(500)),
  memory: z.object({ longTerm: z.boolean(), windowMessages: z.number().int().min(1).max(100) }),
  model: z.object({
    provider: z.enum(["local", "anthropic"]),
    model: z.string().max(80),
    variability: z.number().min(0).max(1),
    maxSteps: z.number().int().min(1).max(8),
    timeoutMs: z.number().int().min(1_000).max(120_000),
    retries: z.number().int().min(0).max(3),
    fallbackToLocal: z.boolean(),
  }),
  evalScenarios: z.array(z.string()),
});

const agentRecordSchema = z.object({
  id: z.string(),
  name: z.string().max(80),
  createdAt: z.iso.datetime(),
  draft: agentConfigSchema,
  versions: z.array(
    z.object({
      number: z.number().int().positive(),
      config: agentConfigSchema,
      note: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
  publishedVersion: z.number().int().nullable(),
  history: z.array(
    z.object({
      type: z.enum(["publish", "rollback"]),
      version: z.number().int(),
      at: z.iso.datetime(),
      note: z.string(),
    }),
  ),
});

const memoryFactSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  kind: z.enum(["commitment", "preference", "claim", "context"]),
  text: z.string().max(300),
  observedAt: isoDate,
  expiresAt: isoDate.nullable(),
  supersededBy: z.string().nullable(),
  topic: z.string(),
});

const conceptId = z.enum(Object.keys(CONCEPTS) as [keyof typeof CONCEPTS, ...(keyof typeof CONCEPTS)[]]);

const checkSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tool_called"),
    tool: toolName,
    argsInclude: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  }),
  z.object({ type: z.literal("tool_not_called"), tool: toolName }),
  z.object({ type: z.literal("no_invalid_tool_calls") }),
  z.object({ type: z.literal("no_foreign_customer_access") }),
  z.object({ type: z.literal("max_tool_calls"), max: z.number().int().min(0) }),
  z.object({
    type: z.literal("state"),
    assertion: z.enum([
      "return_scheduled",
      "no_return",
      "escalated",
      "do_not_contact",
      "payment_applied",
      "complaint_registered",
    ]),
  }),
  z.object({ type: z.literal("mentions"), concept: conceptId }),
  z.object({ type: z.literal("avoids_forbidden_phrases") }),
  z.object({ type: z.literal("discloses_ai") }),
  z.object({ type: z.literal("judge"), rubric: z.string().min(5).max(500) }),
]);

export const evalCaseSchema = z.object({
  id: z.string().min(1).max(60),
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  category: z.enum(["functional", "tool_calling", "safety", "compliance", "memory"]),
  critical: z.boolean(),
  customerId: z.string(),
  today: isoDate.optional(),
  memory: z.array(memoryFactSchema).optional(),
  turns: z.array(z.string().min(1).max(500)).min(1).max(8),
  checks: z.array(checkSchema).min(1).max(12),
  origin: z.enum(["built_in", "custom"]),
});

const intervalSchema = z.object({ low: z.number(), high: z.number() });

const suiteSummarySchema = z.object({
  runs: z.number(),
  passes: z.number(),
  passRate: z.number(),
  interval: intervalSchema,
  cases: z.array(
    z.object({
      caseId: z.string(),
      runs: z.number(),
      passes: z.number(),
      passRate: z.number(),
      interval: intervalSchema,
      flaky: z.boolean(),
      failures: z.array(
        z.object({
          label: z.string(),
          kind: z.enum(["deterministic", "semantic", "judge"]),
          count: z.number(),
        }),
      ),
    }),
  ),
  criticalFailures: z.array(z.string()),
  flakyCases: z.number(),
  latencyP50Ms: z.number(),
  latencyP95Ms: z.number(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).nullable(),
});

export const agentLabStateSchema = z.object({
  schemaVersion: z.literal(AGENT_LAB_SCHEMA_VERSION),
  agents: z.record(z.string(), agentRecordSchema),
  customCases: z.array(evalCaseSchema),
  gate: z.object({
    enabled: z.boolean(),
    minPassRate: z.number().min(0).max(1),
    useLowerBound: z.boolean(),
    requireCriticalCases: z.boolean(),
    minRepetitions: z.number().int().min(1).max(20),
    maxP95LatencyMs: z.number().nullable(),
  }),
  evalHistory: z.array(
    z.object({
      id: z.string(),
      agentId: z.string(),
      version: z.number().int().nullable(),
      providerId: z.string(),
      model: z.string().nullable(),
      at: z.iso.datetime(),
      repetitions: z.number().int(),
      caseIds: z.array(z.string()),
      summary: suiteSummarySchema,
    }),
  ),
}) satisfies z.ZodType<AgentLabState>;

export function parseAgentLabState(data: unknown): AgentLabState | null {
  const result = agentLabStateSchema.safeParse(data);
  return result.success ? (result.data as AgentLabState) : null;
}
