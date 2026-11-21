"use client";

import { GitCompare, Rocket, Save, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { diffConfigs } from "../domain/agent-config";
import { checkPublish, latestEvalFor } from "../domain/agent-lab-state";
import { findVersion, hasUnsavedChanges, latestVersion, type AgentRecord } from "../domain/agent-registry";
import { pct } from "../domain/evaluation";
import { useAgentLabActions, useAgentLabState } from "./agent-lab-context";

/** Versiones inmutables, diferencias entre versiones, publicación con quality gate, rollback e historial. */
export function AgentVersionsPanel({ agent, onRestored }: { agent: AgentRecord; onRestored: () => void }) {
  const state = useAgentLabState();
  const actions = useAgentLabActions();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const latest = latestVersion(agent);
  const [compareFrom, setCompareFrom] = useState<number | "draft">(
    agent.publishedVersion ?? latest?.number ?? "draft",
  );
  const [compareTo, setCompareTo] = useState<number | "draft">("draft");

  const configOf = (v: number | "draft") => (v === "draft" ? agent.draft : findVersion(agent, v)?.config);
  const from = configOf(compareFrom);
  const to = configOf(compareTo);
  const changes = from && to ? diffConfigs(from, to) : [];

  const run = (action: () => void, ok: string) => {
    try {
      action();
      setMessage({ tone: "ok", text: ok });
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
    }
  };

  const versionOptions = [
    ...agent.versions.map((v) => ({ value: String(v.number), label: `v${v.number} — ${v.note}` })),
    { value: "draft", label: "Borrador actual" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardTitle>Guardar una versión</CardTitle>
        <CardDescription>
          Congela el borrador con un número. Las versiones no se modifican: para cambiar algo, se edita el
          borrador y se guarda otra.
        </CardDescription>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => actions.saveVersion(agent.id, note), "Versión guardada.");
            setNote("");
          }}
        >
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Qué cambió (por ejemplo: plazo de retiro a 10 días)"
            aria-label="Nota de la versión"
            maxLength={200}
            className="border-border bg-surface-2 text-foreground h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
          />
          <Button type="submit" disabled={!hasUnsavedChanges(agent)}>
            <Save aria-hidden /> Guardar versión
          </Button>
        </form>
        {!hasUnsavedChanges(agent) ? (
          <p className="text-muted mt-2 text-xs">El borrador es igual a la última versión.</p>
        ) : null}
        {message ? (
          <p
            role="status"
            className={message.tone === "error" ? "text-danger mt-3 text-sm" : "text-success mt-3 text-sm"}
          >
            {message.text}
          </p>
        ) : null}

        <h3 className="text-foreground mt-5 mb-2 text-sm font-semibold">Versiones</h3>
        {agent.versions.length === 0 ? (
          <p className="text-muted text-sm">Todavía no hay versiones guardadas.</p>
        ) : (
          <ul className="space-y-2">
            {[...agent.versions].reverse().map((version) => {
              const published = agent.publishedVersion === version.number;
              const check = checkPublish(state, agent.id, version.number);
              const evaluation = latestEvalFor(state, agent.id, version.number);
              const isRollback = agent.publishedVersion !== null && version.number < agent.publishedVersion;
              return (
                <li
                  key={version.number}
                  className="border-border rounded-md border p-3"
                  data-testid={`version-${version.number}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground font-semibold">v{version.number}</span>
                    <span className="text-muted min-w-0 flex-1 text-sm">{version.note}</span>
                    {published ? <Badge tone="success">Publicada</Badge> : null}
                    {evaluation ? (
                      <Badge tone={evaluation.summary.criticalFailures.length ? "warning" : "accent"}>
                        Eval: {pct(evaluation.summary.passRate)}
                      </Badge>
                    ) : (
                      <Badge>Sin evaluar</Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!published ? (
                      <Button
                        size="sm"
                        variant={isRollback ? "secondary" : "primary"}
                        onClick={() =>
                          run(
                            () => actions.publish(agent.id, version.number),
                            isRollback
                              ? `Rollback a v${version.number} hecho.`
                              : `v${version.number} publicada.`,
                          )
                        }
                      >
                        {isRollback ? <Undo2 aria-hidden /> : <Rocket aria-hidden />}
                        {isRollback ? "Rollback" : "Publicar"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        actions.restoreDraftFrom(agent.id, version.number);
                        onRestored();
                        setMessage({ tone: "ok", text: `El borrador ahora parte de v${version.number}.` });
                      }}
                    >
                      Editar desde esta versión
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/agents/evals?agent=${agent.id}&a=${version.number}`}>Evaluar</Link>
                    </Button>
                  </div>
                  {!published && !check.allowed ? (
                    <ul
                      className="text-muted mt-2 list-disc pl-5 text-xs"
                      aria-label="Por qué no se puede publicar"
                    >
                      {check.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-muted mt-3 text-xs">
          Quality gate {state.gate.enabled ? "activo" : "desactivado"}: se configura en{" "}
          <Link href="/agents/evals" className="text-accent hover:underline">
            Evals
          </Link>
          . El rollback no pasa por el gate: es el camino de emergencia.
        </p>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardTitle className="flex items-center gap-2">
            <GitCompare aria-hidden className="size-4" /> Diferencias entre versiones
          </CardTitle>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              aria-label="Versión base"
              className="border-border bg-surface-2 text-foreground h-9 rounded-md border px-2 text-sm"
              value={String(compareFrom)}
              onChange={(e) => setCompareFrom(e.target.value === "draft" ? "draft" : Number(e.target.value))}
            >
              {versionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Versión a comparar"
              className="border-border bg-surface-2 text-foreground h-9 rounded-md border px-2 text-sm"
              value={String(compareTo)}
              onChange={(e) => setCompareTo(e.target.value === "draft" ? "draft" : Number(e.target.value))}
            >
              {versionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {changes.length === 0 ? (
            <p className="text-muted mt-3 text-sm">Sin diferencias.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Campo</th>
                    <th className="py-1 pr-2 font-medium">Antes</th>
                    <th className="py-1 font-medium">Después</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.path} className="border-border border-t align-top">
                      <td className="text-foreground py-1.5 pr-2 font-mono">{c.path}</td>
                      <td className="text-danger py-1.5 pr-2 break-words whitespace-pre-wrap">
                        {truncate(c.before)}
                      </td>
                      <td className="text-success py-1.5 break-words whitespace-pre-wrap">
                        {truncate(c.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Historial de publicaciones</CardTitle>
          {agent.history.length === 0 ? (
            <p className="text-muted mt-2 text-sm">Nunca se publicó.</p>
          ) : (
            <ol className="mt-2 space-y-1.5 text-sm">
              {[...agent.history].reverse().map((event) => (
                <li key={event.at + event.version} className="flex flex-wrap gap-2">
                  <Badge tone={event.type === "rollback" ? "warning" : "success"}>
                    {event.type === "rollback" ? "Rollback" : "Publicación"} v{event.version}
                  </Badge>
                  <span className="text-muted text-xs">{new Date(event.at).toLocaleString("es-AR")}</span>
                  {event.note ? <span className="text-muted w-full text-xs">{event.note}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function truncate(text: string): string {
  return text.length > 400 ? `${text.slice(0, 399)}…` : text;
}
