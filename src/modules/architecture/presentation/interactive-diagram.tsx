"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BaseEdge,
  Controls,
  getBezierPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, Route, Waves } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/shared/layout/theme-toggle";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  DIAGRAM_EDGE_LABELS,
  type ArchitectureDiagram,
  type DiagramEdgeKind,
  type DiagramNode,
} from "../domain/diagram";
import { NODE_KIND_VISUALS } from "./diagram-visuals";

const CELL_W = 260;
const CELL_H = 120;
const NODE_W = 180;
const BOUNDARY_PAD = 28;

type Side = "top" | "right" | "bottom" | "left";
const SIDES: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

interface NodeData extends Record<string, unknown> {
  node: DiagramNode;
  selected: boolean;
  dimmed: boolean;
  highlighted: boolean;
}

function DiagramNodeView({ data }: NodeProps<Node<NodeData>>) {
  const visual = NODE_KIND_VISUALS[data.node.kind];
  const Icon = visual.icon;
  const isBoundary = data.node.kind === "boundary";
  return (
    <div
      className={cn(
        "h-full rounded-lg border-2 transition-opacity",
        isBoundary
          ? "border-border bg-surface-2/40 border-dashed"
          : cn("bg-surface flex items-center gap-2 px-3 py-2 shadow-sm", visual.className),
        data.selected && "ring-accent ring-2",
        data.highlighted && !isBoundary && "ring-warning ring-2",
        data.dimmed && "opacity-35",
      )}
    >
      {(Object.keys(SIDES) as Side[]).map((side) => (
        <span key={side}>
          <Handle
            type="source"
            id={`s-${side}`}
            position={SIDES[side]}
            className="!opacity-0"
            isConnectable={false}
          />
          <Handle
            type="target"
            id={`t-${side}`}
            position={SIDES[side]}
            className="!opacity-0"
            isConnectable={false}
          />
        </span>
      ))}
      {isBoundary ? (
        <span className="text-muted absolute top-1.5 left-3 text-xs font-semibold tracking-wide uppercase">
          {data.node.label}
        </span>
      ) : (
        <>
          <Icon aria-hidden className="text-muted size-4 shrink-0" />
          <span className="text-foreground text-xs leading-tight font-medium">{data.node.label}</span>
        </>
      )}
    </div>
  );
}

const nodeTypes = { diagram: DiagramNodeView };

interface FlowData extends Record<string, unknown> {
  /** Si hay un "paquete" recorriendo la conexión. */
  flowing: boolean;
  color: string;
  /** Segundos que tarda el paquete en recorrer la conexión. */
  duration: number;
  /** Retraso de inicio: dentro de un paso, las conexiones se animan en el orden en que aparecen. */
  delay: number;
}

/**
 * Conexión con un punto que la recorre desde el origen hacia el destino, para ver la dirección del flujo. Los
 * mensajes asíncronos se mueven más lento que las llamadas síncronas.
 */
function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgStyle,
  data,
}: EdgeProps<Edge<FlowData>>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={style}
        label={label}
        labelX={labelX}
        labelY={labelY}
        labelStyle={labelStyle}
        labelShowBg
        labelBgStyle={labelBgStyle}
      />
      {data?.flowing && (
        <circle r={4.5} fill={data.color} stroke="var(--surface)" strokeWidth={1.5} aria-hidden>
          <animateMotion
            dur={`${data.duration}s`}
            begin={`${data.delay}s`}
            repeatCount="indefinite"
            path={path}
            keyPoints="0;1"
            keyTimes="0;1"
            calcMode="linear"
          />
        </circle>
      )}
    </>
  );
}

const edgeTypes = { flow: FlowEdge };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Respeta la preferencia del sistema de reducir animaciones. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true, // en el servidor no se anima: el cliente decide al hidratar
  );
}

/** Tiempo que se muestra cada paso al reproducir el recorrido automáticamente. */
const AUTOPLAY_STEP_MS = 6_000;

const EDGE_STYLES: Record<DiagramEdgeKind, { strokeDasharray?: string; stroke: string; animated: boolean }> =
  {
    sync: { stroke: "var(--accent)", animated: false },
    async: { stroke: "var(--warning)", strokeDasharray: "6 4", animated: true },
    dependency: { stroke: "var(--violet)", strokeDasharray: "2 4", animated: false },
  };

function sidesBetween(from: DiagramNode, to: DiagramNode): [Side, Side] {
  const dx = to.column - from.column;
  const dy = to.row - from.row;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ["right", "left"] : ["left", "right"];
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
}

/** Rectángulo de un límite: envuelve a sus hijos (en grilla lógica) con un margen. */
function boundaryRect(boundary: DiagramNode, nodes: readonly DiagramNode[]) {
  const children = nodes.filter((n) => n.parent === boundary.id);
  if (children.length === 0) {
    return { x: boundary.column * CELL_W, y: boundary.row * CELL_H, width: NODE_W, height: 60 };
  }
  const minX = Math.min(...children.map((c) => c.column)) * CELL_W - BOUNDARY_PAD;
  const minY = Math.min(...children.map((c) => c.row)) * CELL_H - BOUNDARY_PAD - 14;
  const maxX = Math.max(...children.map((c) => c.column)) * CELL_W + NODE_W + BOUNDARY_PAD;
  const maxY = Math.max(...children.map((c) => c.row)) * CELL_H + 52 + BOUNDARY_PAD;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Diagrama de arquitectura interactivo: zoom, pan, pantalla completa, inspección de cada elemento (responsabilidad
 * y ejemplos de implementación) y recorrido paso a paso. Debajo del lienzo hay una lista de elementos accesible por
 * teclado que permite la misma inspección sin usar el mouse.
 */
export function InteractiveDiagram({ diagram }: { diagram: ArchitectureDiagram }) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showFlow, setShowFlow] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  const animate = showFlow && !reducedMotion;

  // Reproducción automática: avanza un paso cada AUTOPLAY_STEP_MS y se detiene después del último.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => {
        if (stepIndex !== null && stepIndex >= diagram.steps.length - 1) setPlaying(false);
        else setStepIndex(stepIndex === null ? 0 : stepIndex + 1);
      },
      stepIndex === null ? 0 : AUTOPLAY_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, stepIndex, diagram.steps.length]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const step = stepIndex === null ? null : diagram.steps[stepIndex];
  const highlight = useMemo(() => new Set(step?.highlight ?? []), [step]);
  const byId = useMemo(() => new Map(diagram.nodes.map((n) => [n.id, n])), [diagram.nodes]);

  const nodes = useMemo<Node<NodeData>[]>(
    () =>
      diagram.nodes.map((node) => {
        const isBoundary = node.kind === "boundary";
        const rect = isBoundary
          ? boundaryRect(node, diagram.nodes)
          : { x: node.column * CELL_W, y: node.row * CELL_H, width: NODE_W, height: 52 };
        return {
          id: node.id,
          type: "diagram",
          position: { x: rect.x, y: rect.y },
          width: rect.width,
          height: rect.height,
          zIndex: isBoundary ? -1 : 1,
          selectable: true,
          draggable: false,
          ariaLabel: `${NODE_KIND_VISUALS[node.kind].label}: ${node.label}`,
          data: {
            node,
            selected: selectedId === node.id,
            highlighted: highlight.has(node.id),
            dimmed: highlight.size > 0 && !highlight.has(node.id) && !isBoundary,
          },
        };
      }),
    [diagram.nodes, selectedId, highlight],
  );

  const edges = useMemo<Edge<FlowData>[]>(
    () =>
      diagram.edges.map((edge) => {
        const from = byId.get(edge.from)!;
        const to = byId.get(edge.to)!;
        const [sourceSide, targetSide] = sidesBetween(from, to);
        const style = EDGE_STYLES[edge.kind];
        const emphasized = highlight.has(edge.id);
        const dimmed = highlight.size > 0 && !emphasized;
        // En un paso, las conexiones resaltadas se animan en el orden en que el paso las lista.
        const order = step
          ? step.highlight.filter((h) => diagram.edges.some((e) => e.id === h)).indexOf(edge.id)
          : -1;
        return {
          id: edge.id,
          type: "flow",
          source: edge.from,
          target: edge.to,
          sourceHandle: `s-${sourceSide}`,
          targetHandle: `t-${targetSide}`,
          label: edge.label,
          data: {
            flowing: animate && edge.kind !== "dependency" && (step ? emphasized : true),
            color: style.stroke,
            duration: edge.kind === "async" ? 2.6 : 1.6,
            delay: order > 0 ? order * 0.7 : 0,
          },
          animated: style.animated && !dimmed,
          markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
          style: {
            stroke: style.stroke,
            strokeDasharray: style.strokeDasharray,
            strokeWidth: emphasized ? 3 : 1.6,
            opacity: dimmed ? 0.25 : 1,
          },
          labelStyle: { fill: "var(--foreground)", fontSize: 11 },
          labelBgStyle: { fill: "var(--surface)" },
        };
      }),
    [diagram.edges, byId, highlight, step, animate],
  );

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const connections = selected
    ? diagram.edges
        .filter((e) => e.from === selected.id || e.to === selected.id)
        .map((e) => ({
          edge: e,
          other: byId.get(e.from === selected.id ? e.to : e.from)!,
          outgoing: e.from === selected.id,
        }))
    : [];

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen();
  };

  return (
    <figure className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className={cn(
          "border-border bg-background relative overflow-hidden rounded-lg border",
          fullscreen ? "h-screen" : "h-[26rem]",
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={theme}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <div className="absolute top-2 right-2 z-10 flex gap-1.5">
          {!reducedMotion && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowFlow((v) => !v)}
              aria-pressed={showFlow}
              aria-label={showFlow ? "Pausar la animación del flujo" : "Animar el flujo"}
              title={showFlow ? "Pausar la animación del flujo" : "Animar el flujo"}
            >
              <Waves />
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
        {step && fullscreen && (
          <div className="border-border bg-surface/95 absolute right-2 bottom-2 left-2 z-10 rounded-lg border p-3 md:left-auto md:max-w-md">
            <p className="text-foreground text-sm font-medium">{step.title}</p>
            <p className="text-muted mt-1 text-sm">{step.description}</p>
          </div>
        )}
      </div>

      <figcaption className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-foreground font-medium">{diagram.title}.</span>
        {(Object.keys(DIAGRAM_EDGE_LABELS) as DiagramEdgeKind[])
          .filter((kind) => diagram.edges.some((e) => e.kind === kind))
          .map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1.5">
              <svg width="24" height="6" aria-hidden>
                <line
                  x1="0"
                  y1="3"
                  x2="24"
                  y2="3"
                  stroke={EDGE_STYLES[kind].stroke}
                  strokeWidth="2"
                  strokeDasharray={EDGE_STYLES[kind].strokeDasharray}
                />
              </svg>
              {DIAGRAM_EDGE_LABELS[kind]}
            </span>
          ))}
        <span>Hacé clic en un elemento para ver su responsabilidad.</span>
      </figcaption>

      {diagram.steps.length > 0 && (
        <div className="border-border bg-surface rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Route aria-hidden className="text-accent size-4" /> Recorrido paso a paso
            </h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={playing ? "secondary" : "primary"}
                onClick={() => {
                  if (playing) return setPlaying(false);
                  if (stepIndex === diagram.steps.length - 1) setStepIndex(null);
                  setPlaying(true);
                }}
              >
                {playing ? <Pause /> : <Play />} {playing ? "Pausar" : "Reproducir"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={stepIndex === null || stepIndex === 0}
                onClick={() => {
                  setPlaying(false);
                  setStepIndex((i) => (i === null ? null : i - 1));
                }}
                aria-label="Paso anterior"
              >
                <ChevronLeft />
              </Button>
              <span className="text-muted text-xs tabular-nums" aria-live="polite">
                {stepIndex === null
                  ? `${diagram.steps.length} pasos`
                  : `Paso ${stepIndex + 1} de ${diagram.steps.length}`}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={stepIndex === diagram.steps.length - 1}
                onClick={() => {
                  setPlaying(false);
                  setStepIndex((i) => (i === null ? 0 : i + 1));
                }}
                aria-label={stepIndex === null ? "Comenzar recorrido" : "Paso siguiente"}
              >
                <ChevronRight />
              </Button>
              {stepIndex !== null && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPlaying(false);
                    setStepIndex(null);
                  }}
                >
                  Salir
                </Button>
              )}
            </div>
          </div>
          {step && (
            <div className="mt-3">
              <p className="text-foreground text-sm font-medium">{step.title}</p>
              <p className="text-muted mt-1 text-sm">{step.description}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[minmax(0,14rem)_1fr]">
        <div>
          <h3 className="text-muted mb-2 text-xs font-semibold tracking-wide uppercase">Elementos</h3>
          <ul className="flex flex-wrap gap-1.5 md:flex-col">
            {diagram.nodes
              .filter((n) => n.kind !== "boundary")
              .map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    aria-pressed={selectedId === node.id}
                    onClick={() => setSelectedId(node.id)}
                    className={cn(
                      "border-border hover:bg-surface-2 w-full rounded-md border px-2 py-1 text-left text-xs",
                      selectedId === node.id
                        ? "bg-accent/15 text-accent border-accent/40"
                        : "text-foreground",
                    )}
                  >
                    {node.label}
                  </button>
                </li>
              ))}
          </ul>
        </div>
        <section
          aria-live="polite"
          aria-label="Detalle del elemento seleccionado"
          className="border-border bg-surface min-h-32 rounded-lg border p-4"
        >
          {selected ? (
            <>
              <p className="text-muted text-xs">{NODE_KIND_VISUALS[selected.kind].label}</p>
              <h3 className="text-foreground text-base font-semibold">{selected.label}</h3>
              <p className="text-foreground mt-2 text-sm">{selected.responsibility}</p>
              <h4 className="text-muted mt-3 text-xs font-semibold tracking-wide uppercase">
                Ejemplos de implementación
              </h4>
              <ul className="text-foreground mt-1 list-disc pl-5 text-sm">
                {selected.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
              {connections.length > 0 && (
                <>
                  <h4 className="text-muted mt-3 text-xs font-semibold tracking-wide uppercase">
                    Conexiones
                  </h4>
                  <ul className="text-muted mt-1 text-sm">
                    {connections.map(({ edge, other, outgoing }) => (
                      <li key={edge.id}>
                        {outgoing ? "→" : "←"} {other.label}
                        <span className="text-xs">
                          {" "}
                          · {DIAGRAM_EDGE_LABELS[edge.kind].toLowerCase()}
                          {edge.label ? ` (${edge.label})` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="text-muted text-sm">
              Seleccioná un elemento en el diagrama o en la lista para ver su responsabilidad, ejemplos de
              implementación y conexiones.
            </p>
          )}
        </section>
      </div>
    </figure>
  );
}
