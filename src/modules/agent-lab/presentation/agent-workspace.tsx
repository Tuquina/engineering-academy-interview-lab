"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { useIsClient } from "@/shared/lib/use-is-client";
import { Badge } from "@/shared/ui/badge";
import { hasUnsavedChanges } from "../domain/agent-registry";
import { AgentConfigForm } from "./agent-config-form";
import { useAgentLabActions, useAgentLabState } from "./agent-lab-context";
import { AgentPlayground } from "./agent-playground";
import { AgentVersionsPanel } from "./agent-versions-panel";

const TABS = [
  { id: "config", label: "Configuración" },
  { id: "versions", label: "Versiones" },
  { id: "playground", label: "Playground" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Espacio de trabajo de un agente: configuración del borrador, versionado y playground. */
export function AgentWorkspace({ agentId }: { agentId: string }) {
  const isClient = useIsClient();
  const state = useAgentLabState();
  const actions = useAgentLabActions();
  const [tab, setTab] = useState<TabId>("config");
  const [formRevision, setFormRevision] = useState(0);
  const agent = state.agents[agentId];

  if (!isClient) return <p className="text-muted text-sm">Cargando el agente guardado en este navegador…</p>;
  if (!agent) {
    return (
      <div className="text-muted text-sm">
        <p>No existe este agente en este navegador.</p>
        <Link href="/agents" className="text-accent hover:underline">
          Volver al AI Agents Lab
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="agent-name" className="sr-only">
            Nombre del agente
          </label>
          <input
            id="agent-name"
            value={agent.name}
            onChange={(e) => actions.renameAgent(agent.id, e.target.value)}
            className="text-foreground w-full bg-transparent text-2xl font-bold tracking-tight focus-visible:outline-none"
          />
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={agent.publishedVersion ? "success" : "neutral"}>
              {agent.publishedVersion ? `Publicada: v${agent.publishedVersion}` : "Sin publicar"}
            </Badge>
            {hasUnsavedChanges(agent) ? (
              <Badge tone="warning">Borrador con cambios sin guardar como versión</Badge>
            ) : null}
          </div>
        </div>
      </header>
      <div
        role="tablist"
        aria-label="Secciones del agente"
        className="border-border mb-4 flex gap-1 border-b"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.id
                ? "border-accent text-foreground"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "config" ? (
          <AgentConfigForm
            key={formRevision}
            config={agent.draft}
            onChange={(draft) => actions.updateDraft(agent.id, draft)}
          />
        ) : tab === "versions" ? (
          <AgentVersionsPanel agent={agent} onRestored={() => setFormRevision((r) => r + 1)} />
        ) : (
          <AgentPlayground agent={agent} />
        )}
      </div>
    </div>
  );
}
