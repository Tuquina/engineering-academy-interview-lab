"use client";

import { Bot, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { hasUnsavedChanges } from "../domain/agent-registry";
import { useAgentLabActions, useAgentLabState } from "./agent-lab-context";

/** Lista de agentes del laboratorio con su versión publicada y acciones básicas. */
export function AgentsHub() {
  const state = useAgentLabState();
  const actions = useAgentLabActions();
  const router = useRouter();
  const isClient = useIsClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const agents = Object.values(state.agents).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const create = () => {
    try {
      const id = actions.createAgent(name || "Nuevo agente");
      setName("");
      router.push(`/agents/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <section aria-labelledby="mis-agentes">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 id="mis-agentes" className="text-foreground text-xl font-semibold tracking-tight">
          Agentes
        </h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <label className="sr-only" htmlFor="new-agent-name">
            Nombre del nuevo agente
          </label>
          <input
            id="new-agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del nuevo agente"
            maxLength={80}
            className="border-border bg-surface-2 text-foreground h-9 rounded-md border px-3 text-sm"
          />
          <Button type="submit" size="md">
            <Plus aria-hidden /> Crear
          </Button>
        </form>
      </div>
      {error ? <p className="text-danger mb-3 text-sm">{error}</p> : null}
      {!isClient ? (
        <p className="text-muted text-sm">Cargando agentes guardados en este navegador…</p>
      ) : agents.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted mb-3 text-sm">No hay agentes. Podés crear uno o restaurar el ejemplo.</p>
          <Button variant="secondary" onClick={actions.restoreExamples}>
            <RotateCcw aria-hidden /> Restaurar ejemplo
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <li key={agent.id} className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-5">
              <div className="flex items-start gap-3">
                <Bot aria-hidden className="text-accent mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/agents/${agent.id}`}
                    className="text-foreground font-semibold hover:underline"
                  >
                    {agent.name}
                  </Link>
                  <p className="text-muted text-sm">
                    {agent.draft.identity.agentName} · {agent.draft.identity.role}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Borrar ${agent.name}`}
                  onClick={() => {
                    if (window.confirm(`¿Borrar "${agent.name}" con todas sus versiones y evaluaciones?`)) {
                      actions.deleteAgent(agent.id);
                    }
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={agent.publishedVersion ? "success" : "neutral"}>
                  {agent.publishedVersion ? `Publicada: v${agent.publishedVersion}` : "Sin publicar"}
                </Badge>
                <Badge>{agent.versions.length} versión(es)</Badge>
                {hasUnsavedChanges(agent) ? <Badge tone="warning">Borrador con cambios</Badge> : null}
                <Badge>{agent.draft.tools.length} herramientas</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
