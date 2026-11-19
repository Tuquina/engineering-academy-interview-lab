import { BrainCircuit, FlaskConical, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AgentsHub } from "@/modules/agent-lab/presentation/agents-hub";
import { MermaidDiagram } from "@/modules/learning/presentation/mdx/mermaid-diagram";

export const metadata: Metadata = { title: "AI Agents Lab" };

const TOOLS = [
  {
    href: "/agents/tools",
    icon: Wrench,
    title: "Tool Calling Simulator",
    text: "Invocá las herramientas a mano: argumentos, validación de esquema, reglas de negocio, estado antes y después.",
  },
  {
    href: "/agents/memory",
    icon: BrainCircuit,
    title: "Memoria",
    text: "Día 1 promete pagar el 15; día 5 se arma una campaña. Memoria conversacional, estado del negocio e historial.",
  },
  {
    href: "/agents/evals",
    icon: FlaskConical,
    title: "Eval Playground",
    text: "Suite de regresión, repeticiones, variabilidad, comparación A/B con control de falsos positivos y quality gate.",
  },
] as const;

export default function AgentsLabPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">AI Agents Lab</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Laboratorio de ingeniería de agentes de cobranzas: configuración versionada, tool calling con
          validación, memoria, evaluaciones y publicación con quality gate. Funciona sin API key con un
          proveedor local determinista (una simulación, siempre identificada como tal).
        </p>
      </header>

      <ul className="mb-8 grid gap-4 md:grid-cols-3">
        {TOOLS.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="border-border bg-surface hover:border-accent/50 flex h-full gap-3 rounded-lg border p-5 transition-colors"
            >
              <Icon aria-hidden className="text-accent size-5 shrink-0" />
              <span>
                <span className="text-foreground block font-semibold">{title}</span>
                <span className="text-muted text-sm">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <AgentsHub />

      <section aria-labelledby="como-funciona" className="mt-10">
        <h2 id="como-funciona" className="text-foreground mb-3 text-xl font-semibold tracking-tight">
          Cómo funciona un turno
        </h2>
        <MermaidDiagram
          caption="El loop de herramientas vive en la aplicación: el modelo propone, el código valida, ejecuta y registra."
          chart={`
sequenceDiagram
  participant P as Persona
  participant A as Aplicación (runAgentTurn)
  participant M as Modelo (local o real)
  participant T as Herramientas
  P->>A: mensaje
  A->>A: system prompt + memoria vigente + ventana de mensajes
  A->>M: generate (timeout, reintentos, fallback)
  M-->>A: tool_use(get_debt)
  A->>T: ¿habilitada? ¿esquema válido? reglas de negocio
  T-->>A: resultado + estado nuevo + traza
  A->>M: tool_result
  M-->>A: respuesta final
  A->>A: extraer hechos para la memoria
  A-->>P: respuesta
`}
        />
        <p className="text-muted mt-3 text-sm">
          La teoría está en el curso{" "}
          <Link href="/courses/llms-y-agentes" className="text-accent hover:underline">
            LLMs y agentes
          </Link>
          : tool calling, memoria, guardrails y evaluaciones.
        </p>
      </section>
    </div>
  );
}
