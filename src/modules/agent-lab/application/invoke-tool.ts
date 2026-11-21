import type { AgentPolicies, ToolName } from "../domain/agent-config";
import { customerSnapshot, describeChanges, type SupportWorld, type IsoDate } from "../domain/support-world";
import { isKnownTool, type ToolCallTrace } from "../domain/conversation";
import { executeTool } from "../domain/tools";
import { validateToolArgs } from "./tool-schemas";

export interface InvokeToolInput {
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
  readonly world: SupportWorld;
  readonly allowedTools: readonly ToolName[];
  readonly today: IsoDate;
  readonly policies: AgentPolicies;
  readonly sessionCustomerId: string;
  /** Reloj monotónico inyectable (performance.now en el navegador). */
  readonly clock?: () => number;
}

/**
 * Caso de uso: ejecutar una llamada a herramienta pedida por el modelo (o por el usuario en el simulador).
 *
 * Orden de las verificaciones, de la más barata a la más costosa: que la herramienta esté permitida para este
 * agente, que los argumentos cumplan el esquema y, recién entonces, las reglas de negocio. Devuelve la traza completa
 * y el mundo resultante (igual al anterior si hubo error).
 */
export function invokeTool(input: InvokeToolInput): { trace: ToolCallTrace; world: SupportWorld } {
  const clock = input.clock ?? (() => performance.now());
  const started = clock();
  const before = customerSnapshot(input.world, input.sessionCustomerId);
  const base = { id: input.id, name: input.name, input: input.input, before };

  const finish = (
    partial: Pick<ToolCallTrace, "status" | "validationIssues" | "result" | "error">,
    world: SupportWorld,
  ) => {
    const after = customerSnapshot(world, input.sessionCustomerId);
    const trace: ToolCallTrace = {
      ...base,
      ...partial,
      after,
      changes: describeChanges(before, after),
      durationMs: Math.max(0, clock() - started),
    };
    return { trace, world };
  };

  if (!isKnownTool(input.name, input.allowedTools)) {
    return finish(
      {
        status: "not_allowed",
        validationIssues: [],
        result: null,
        error: `La herramienta "${input.name}" no está habilitada para este agente.`,
      },
      input.world,
    );
  }

  const validation = validateToolArgs(input.name, input.input);
  if (!validation.ok) {
    return finish(
      {
        status: "invalid_args",
        validationIssues: validation.issues,
        result: null,
        error: "Los argumentos no cumplen el esquema de la herramienta.",
      },
      input.world,
    );
  }

  const outcome = executeTool(input.name, input.world, validation.data, {
    today: input.today,
    policies: input.policies,
    sessionCustomerId: input.sessionCustomerId,
  });
  if (!outcome.ok) {
    return finish(
      {
        status: "business_error",
        validationIssues: [],
        result: { code: outcome.code },
        error: outcome.error,
      },
      input.world,
    );
  }
  return finish({ status: "ok", validationIssues: [], result: outcome.result, error: null }, outcome.world);
}

/** Contenido del `tool_result` que vuelve al modelo: el resultado o el error, en JSON compacto. */
export function toolResultContent(trace: ToolCallTrace): string {
  if (trace.status === "ok") return JSON.stringify(trace.result);
  return JSON.stringify({
    error: trace.error,
    ...(trace.validationIssues.length ? { issues: trace.validationIssues } : {}),
  });
}
