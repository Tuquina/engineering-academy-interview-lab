"use client";

import { FlaskConical, Pause, Play, RotateCcw, Shuffle, StepForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { findSimulation } from "../domain/simulations/catalog";
import {
  formatNumber,
  sanitizeParameters,
  type EntityStatus,
  type ParameterValues,
} from "../domain/simulations/simulation";

const STATUS_STYLES: Record<EntityStatus, { bar: string; label: string }> = {
  idle: { bar: "bg-muted/40", label: "Inactivo" },
  ok: { bar: "bg-success", label: "Normal" },
  busy: { bar: "bg-accent", label: "Ocupado" },
  warning: { bar: "bg-warning", label: "Bajo presión" },
  down: { bar: "bg-danger", label: "Saturado o caído" },
};

const LINE_COLORS = ["var(--accent)", "var(--warning)", "var(--success)", "var(--danger)"];
const SPEEDS = [1, 2, 4, 8] as const;

/**
 * Ejecuta un simulador determinista y reproduce su línea temporal: estado de cada entidad, métricas por tick y
 * eventos. Los parámetros se ajustan a los rangos declarados; la semilla permite repetir exactamente una corrida.
 */
export function SimulatorView({ slug }: { slug: string }) {
  // La página valida el slug antes de renderizar (notFound), así que siempre existe.
  const definition = findSimulation(slug)!;
  const [params, setParams] = useState<ParameterValues>(definition.defaults);
  const [seed, setSeed] = useState(42);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);

  const result = useMemo(
    () => definition.run(sanitizeParameters(definition, params), seed),
    [definition, params, seed],
  );
  const last = result.frames.length - 1;
  const frame = result.frames[Math.min(tick, last)]!;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTick((t) => {
        if (t >= last) {
          setPlaying(false);
          return t;
        }
        return Math.min(last, t + speed);
      });
    }, definition.tickMs);
    return () => window.clearInterval(timer);
  }, [playing, speed, last, definition.tickMs]);

  const change = (key: string, value: number | string) => {
    setParams((p) => ({ ...p, [key]: value }));
    setTick(0);
    setPlaying(false);
  };

  const chartData = useMemo(
    () =>
      result.frames.map((f) => {
        const point: Record<string, number> = { t: (f.tick * definition.tickMs) / 1000 };
        for (const metric of definition.metrics) point[metric.key] = result.series[metric.key]?.[f.tick] ?? 0;
        return point;
      }),
    [result, definition],
  );

  const recentEvents = useMemo(
    () =>
      result.frames
        .slice(0, tick + 1)
        .flatMap((f) => f.events.map((text) => ({ tick: f.tick, text })))
        .slice(-10)
        .reverse(),
    [result, tick],
  );

  const seconds = (frame.tick * definition.tickMs) / 1000;

  return (
    <div className="flex flex-col gap-5">
      <div
        role="note"
        className="border-warning/40 bg-warning/10 text-foreground flex gap-3 rounded-lg border px-4 py-3 text-sm"
      >
        <FlaskConical aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Modelo simplificado.</strong> Los números salen de un modelo determinista para entender
          causas y efectos; no son mediciones de infraestructura real. Abajo se detallan las simplificaciones
          y cómo se mide en producción.
        </p>
      </div>

      <section aria-label="Parámetros" className="border-border bg-surface rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {definition.parameters.map((spec) =>
            spec.kind === "choice" ? (
              <label key={spec.key} className="text-muted flex flex-col gap-1 text-xs">
                {spec.label}
                <select
                  value={String(params[spec.key])}
                  onChange={(e) => change(spec.key, e.target.value)}
                  className="border-border bg-background text-foreground rounded-md border px-2 py-1.5 text-sm"
                >
                  {spec.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label key={spec.key} className="text-muted flex flex-col gap-1 text-xs">
                <span className="flex justify-between">
                  {spec.label}
                  <span className="text-foreground font-medium tabular-nums">
                    {formatNumber(Number(params[spec.key]))}
                    {spec.unit ? ` ${spec.unit}` : ""}
                  </span>
                </span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={Number(params[spec.key])}
                  onChange={(e) => change(spec.key, Number(e.target.value))}
                  className="accent-[var(--accent)]"
                />
              </label>
            ),
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-muted text-xs">Semilla {seed}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSeed((s) => (s * 1103515245 + 12345) % 2147483647);
              setTick(0);
            }}
          >
            <Shuffle /> Otra corrida
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setParams(definition.defaults);
              setTick(0);
              setPlaying(false);
            }}
          >
            <RotateCcw /> Valores por defecto
          </Button>
        </div>
      </section>

      <section
        aria-label="Línea temporal"
        className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (tick >= last) setTick(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? <Pause /> : <Play />} {playing ? "Pausar" : tick >= last ? "Repetir" : "Reproducir"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTick((t) => Math.min(last, t + 1))}
            aria-label="Avanzar un tick"
          >
            <StepForward />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTick(last)}>
            Ir al final
          </Button>
          <label className="text-muted ml-2 flex items-center gap-1 text-xs">
            Velocidad
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
              className="border-border bg-background text-foreground rounded-md border px-1 py-0.5 text-xs"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
          <output className="text-foreground ml-auto text-sm tabular-nums" aria-live="off">
            t = {formatNumber(seconds, 1)} s
          </output>
        </div>
        <input
          type="range"
          min={0}
          max={last}
          value={tick}
          onChange={(e) => {
            setTick(Number(e.target.value));
            setPlaying(false);
          }}
          aria-label="Posición en la línea temporal"
          className="w-full accent-[var(--accent)]"
        />

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Estado de los componentes">
          {frame.entities.map((entity) => (
            <li key={entity.id} className="border-border bg-background rounded-md border p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-foreground font-medium">{entity.label}</span>
                <span className="text-muted text-xs">{STATUS_STYLES[entity.status].label}</span>
              </div>
              <div className="bg-surface-2 mt-2 h-2 overflow-hidden rounded-full" aria-hidden>
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-100",
                    STATUS_STYLES[entity.status].bar,
                  )}
                  style={{ width: `${Math.min(100, (entity.value / Math.max(1, entity.max)) * 100)}%` }}
                />
              </div>
              {entity.detail && <p className="text-muted mt-1 text-xs">{entity.detail}</p>}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-label="Métricas" className="border-border bg-surface rounded-lg border p-4">
          <h2 className="text-foreground mb-2 text-sm font-semibold">Métricas por tick</h2>
          <div className="h-72" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: "var(--muted)", fontSize: 11 }} unit=" s" interval={49} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                  labelFormatter={(value) => `t = ${String(value)} s`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  x={chartData[frame.tick]?.t}
                  stroke="var(--foreground)"
                  strokeDasharray="3 3"
                />
                {definition.metrics.map((metric, index) => (
                  <Line
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.label}
                    stroke={LINE_COLORS[index % LINE_COLORS.length]}
                    dot={false}
                    strokeWidth={1.8}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Métricas en el instante actual</caption>
            <tbody>
              {definition.metrics.map((metric) => (
                <tr key={metric.key}>
                  <th scope="row">{metric.label}</th>
                  <td>
                    {formatNumber(result.series[metric.key]?.[frame.tick] ?? 0)} {metric.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-label="Eventos" className="border-border bg-surface rounded-lg border p-4">
          <h2 className="text-foreground mb-2 text-sm font-semibold">Eventos</h2>
          {recentEvents.length === 0 ? (
            <p className="text-muted text-sm">Todavía no ocurrió nada notable. Reproducí la simulación.</p>
          ) : (
            <ol className="flex flex-col gap-2 text-sm" aria-live="polite">
              {recentEvents.map((event, index) => (
                <li key={`${event.tick}-${index}`} className="flex gap-2">
                  <span className="text-muted w-14 shrink-0 text-xs tabular-nums">
                    {formatNumber((event.tick * definition.tickMs) / 1000, 1)} s
                  </span>
                  <span className="text-foreground">{event.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section aria-label="Resumen de la corrida" className="border-border bg-surface rounded-lg border p-4">
        <h2 className="text-foreground mb-3 text-sm font-semibold">Resumen de la corrida completa</h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {result.summary.map((item) => (
            <div key={item.label}>
              <dt className="text-muted text-xs">{item.label}</dt>
              <dd className="text-foreground text-lg font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          { title: "Qué observar", items: definition.whatToObserve },
          { title: "Simplificaciones del modelo", items: definition.simplifications },
          { title: "En infraestructura real", items: definition.realWorld },
        ].map((block) => (
          <section key={block.title} className="border-border bg-surface rounded-lg border p-4">
            <h2 className="text-foreground mb-2 text-sm font-semibold">{block.title}</h2>
            <ul className="text-muted list-disc space-y-1.5 pl-5 text-sm">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
