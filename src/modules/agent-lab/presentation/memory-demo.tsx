"use client";

import { ChevronRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { runAgentTurn } from "../application/run-agent-turn";
import { DEFAULT_CONFIG } from "../domain/agent-config";
import {
  SEED_WORLD,
  customerSnapshot,
  formatDate,
  orderSummary,
  type SupportWorld,
  type IsoDate,
} from "../domain/support-world";
import {
  FACT_KIND_LABELS,
  decideContactEligibility,
  expireReturns,
  reconcile,
  recallFacts,
  type Contradiction,
  type EligibilityDecision,
  type MemoryFact,
} from "../domain/memory";
import { useAgentRuntime } from "./agent-lab-context";

const CUSTOMER = "c-002";
const CONFIG = { ...DEFAULT_CONFIG, model: { ...DEFAULT_CONFIG.model, variability: 0 } };

interface DemoState {
  readonly date: IsoDate;
  readonly world: SupportWorld;
  readonly facts: readonly MemoryFact[];
  readonly said: string | null;
  readonly reply: string | null;
  readonly decision: EligibilityDecision | null;
}

interface Step {
  readonly title: string;
  readonly narrative: string;
  readonly date: IsoDate;
  readonly message?: string;
  readonly campaign?: boolean;
  readonly expire?: boolean;
}

const STEPS: readonly Step[] = [
  {
    title: "Día 1 · pide devolver las zapatillas con retiro el 6",
    narrative:
      "Conversación con el agente. La devolución se programa con una herramienta (estado del negocio) y el agente recuerda el compromiso (memoria).",
    date: "2026-03-01",
    message: "Quiero devolver las zapatillas, que las retiren el 6",
  },
  {
    title: "Día 3 · dice que ya llevó el paquete al correo y pide que le escriban a la tarde",
    narrative:
      "Dos hechos nuevos para la memoria: una preferencia (útil) y una afirmación que el sistema de registro no confirma: el retiro sigue programado.",
    date: "2026-03-03",
    message: "Ya lo llevé al correo. Y escribime siempre a la tarde",
  },
  {
    title: "Día 4 · el orquestador arma los avisos proactivos del día",
    narrative: "Antes de avisar se consulta el estado del negocio (y la memoria para ajustar el cómo).",
    date: "2026-03-04",
    campaign: true,
  },
  {
    title: "Día 5 · víspera del retiro",
    narrative: "Se permite sólo un recordatorio, en la franja que la persona prefiere.",
    date: "2026-03-05",
    campaign: true,
  },
  {
    title: "Día 7 · el transportista no pasó a retirar",
    narrative:
      "Un job diario marca el retiro como no realizado. La memoria del compromiso quedó desactualizada.",
    date: "2026-03-07",
    campaign: true,
    expire: true,
  },
];

const INITIAL: DemoState = {
  date: "2026-02-28",
  world: SEED_WORLD,
  facts: [],
  said: null,
  reply: null,
  decision: null,
};

/** Demostración guiada de memoria (MASTER_PROMPT §16.5) con el proveedor local y una fecha simulada. */
export function MemoryDemo() {
  const runtime = useAgentRuntime();
  const [done, setDone] = useState(0);
  const [state, setState] = useState<DemoState>(INITIAL);
  const [busy, setBusy] = useState(false);

  const advance = async () => {
    const step = STEPS[done];
    if (!step || busy) return;
    setBusy(true);
    try {
      let world = step.expire ? expireReturns(state.world, step.date) : state.world;
      let facts = state.facts;
      let reply: string | null = null;
      if (step.message) {
        const result = await runAgentTurn({
          config: CONFIG,
          provider: runtime.local,
          history: [],
          userMessage: step.message,
          world,
          memory: facts,
          customerId: CUSTOMER,
          today: step.date,
          seed: 1,
        });
        world = result.world;
        facts = result.memory;
        reply = result.reply;
      }
      setState({
        date: step.date,
        world,
        facts,
        said: step.message ?? null,
        reply,
        decision: step.campaign ? decideContactEligibility(world, facts, CUSTOMER, step.date) : null,
      });
      setDone((d) => d + 1);
    } finally {
      setBusy(false);
    }
  };

  const contradictions: Contradiction[] = done
    ? reconcile(state.facts, state.world, CUSTOMER, state.date)
    : [];
  const snapshot = customerSnapshot(state.world, CUSTOMER);
  const order = orderSummary(state.world, CUSTOMER, state.date, CONFIG.policies.returnWindowDays);
  const current = STEPS[done - 1];

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-2" aria-label="Línea de tiempo">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Badge tone={i < done ? "success" : i === done ? "accent" : "neutral"}>
              {formatDate(step.date).slice(0, 5)} · {step.title.split(" · ")[1]}
            </Badge>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void advance()} disabled={busy || done >= STEPS.length}>
          <ChevronRight aria-hidden />{" "}
          {done >= STEPS.length ? "Fin de la demostración" : `Avanzar: ${STEPS[done]!.title}`}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDone(0);
            setState(INITIAL);
          }}
        >
          <RotateCcw aria-hidden /> Reiniciar
        </Button>
      </div>

      <Card>
        <CardTitle>{current ? current.title : "Antes de empezar"}</CardTitle>
        <CardDescription>
          Fecha simulada: {formatDate(state.date)}.{" "}
          {current
            ? current.narrative
            : "Martín recibió sus zapatillas el 20/02 y tiene 30 días para devolverlas. No hay devoluciones programadas."}
        </CardDescription>
        {state.said ? (
          <div className="mt-3 space-y-1.5 text-sm">
            <p>
              <span className="text-muted">Persona:</span>{" "}
              <span className="text-foreground">{state.said}</span>
            </p>
            <p data-testid="memory-demo-reply">
              <span className="text-muted">Agente (proveedor local):</span>{" "}
              <span className="text-foreground">{state.reply}</span>
            </p>
          </div>
        ) : null}
        {state.decision ? (
          <div
            className={cn(
              "mt-3 rounded-md border p-3 text-sm",
              state.decision.eligible ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10",
            )}
            data-testid="eligibility-decision"
          >
            <p className="text-foreground font-semibold">
              Decisión de los avisos: {ACTION_LABELS[state.decision.action]}
            </p>
            <ul className="text-foreground mt-1 list-disc pl-5">
              {state.decision.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="text-muted mt-1 text-xs">Fundamento: {BASIS_LABELS[state.decision.basis]}.</p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>1. Memoria conversacional</CardTitle>
          <CardDescription>
            Lo que el agente recuerda de lo que dijo la persona. Afirmaciones, con fecha y vencimiento.
          </CardDescription>
          {state.facts.length === 0 ? (
            <p className="text-muted mt-2 text-sm">Vacía.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {recallFacts(state.facts, CUSTOMER, state.date).map(({ fact, status }) => (
                <li key={fact.id} className={cn(status !== "active" && status !== "stale" && "opacity-60")}>
                  <Badge
                    tone={
                      fact.kind === "claim" ? "warning" : fact.kind === "commitment" ? "success" : "neutral"
                    }
                  >
                    {FACT_KIND_LABELS[fact.kind]}
                  </Badge>{" "}
                  <span className="text-foreground">{fact.text}</span>
                  <span className="text-muted block text-xs">
                    Observado el {formatDate(fact.observedAt)}
                    {fact.expiresAt ? ` · vence el ${formatDate(fact.expiresAt)}` : ""} ·{" "}
                    {STATUS_LABELS[status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle>2. Estado del negocio</CardTitle>
          <CardDescription>
            Sistema de registro: pedidos, pagos y devoluciones. La verdad para decidir.
          </CardDescription>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
            <dt className="text-muted">Pedido</dt>
            <dd className="text-foreground text-right">{order?.orderId ?? "—"}</dd>
            <dt className="text-muted">Plazo de devolución</dt>
            <dd className="text-foreground text-right">
              {order?.returnDeadline ? formatDate(order.returnDeadline) : "—"}
            </dd>
          </dl>
          <ul className="mt-2 space-y-1 text-sm">
            {snapshot.returns.length === 0 ? <li className="text-muted">Sin devoluciones.</li> : null}
            {snapshot.returns.map((r) => (
              <li key={r.id}>
                <Badge
                  tone={r.status === "scheduled" ? "success" : r.status === "missed" ? "warning" : "neutral"}
                >
                  {RETURN_LABELS[r.status]}
                </Badge>{" "}
                <span className="text-foreground">
                  {r.id}: pedido {r.orderId}, retiro el {formatDate(r.pickupDate)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>3. Historial de eventos</CardTitle>
          <CardDescription>
            Qué pasó y cuándo, en orden. Sirve para auditar y reconstruir el estado.
          </CardDescription>
          <ol className="mt-2 space-y-1 text-xs">
            {state.world.events
              .filter((e) => e.customerId === CUSTOMER)
              .map((e) => (
                <li key={e.id}>
                  <span className="text-muted tabular-nums">{formatDate(e.at)}</span>{" "}
                  <span className="text-foreground">{e.description}</span>
                </li>
              ))}
          </ol>
        </Card>
      </div>

      {contradictions.length ? (
        <Card className="border-warning/40">
          <CardTitle>Información contradictoria o desactualizada</CardTitle>
          <ul className="mt-2 space-y-2 text-sm">
            {contradictions.map((c) => (
              <li key={c.factId + c.message}>
                <p className="text-foreground">{c.message}</p>
                <p className="text-muted text-xs">{c.resolution}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

const ACTION_LABELS: Record<EligibilityDecision["action"], string> = {
  contact: "contactar",
  reminder_only: "sólo recordatorio",
  wait: "no contactar todavía",
  do_not_contact: "no contactar (pedido de la persona)",
  route_to_operator: "derivar a un operador",
  nothing_due: "nada que avisar",
};

const BASIS_LABELS: Record<EligibilityDecision["basis"], string> = {
  business_state: "estado del negocio",
  memory: "memoria",
  both: "estado del negocio, ajustado con la memoria",
};

const STATUS_LABELS = {
  active: "vigente",
  stale: "viejo (más de 30 días)",
  expired: "vencido",
  superseded: "reemplazado",
} as const;
const RETURN_LABELS = {
  scheduled: "Programada",
  picked_up: "Retirada",
  missed: "Retiro no realizado",
} as const;
