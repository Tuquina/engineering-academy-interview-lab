"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { FileJson, ImageDown, Link2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useTheme } from "@/shared/layout/theme-toggle";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  CanvasLimitError,
  COMPONENT_CATALOG,
  COMPONENT_TYPES,
  addNode,
  connect,
  describeDesign,
  removeEdge,
  removeNode,
  toExport,
  updateEdge,
  updateNode,
  type CanvasNode,
  type ComponentType,
  type ConnectionKind,
  type DesignDocument,
} from "../domain/canvas";
import { COMPONENT_ICONS } from "./component-icons";

const DRAG_MIME = "application/x-eal-component";
/** Separación de la grilla para componentes agregados con clic (el nodo mide 192 px de ancho). */
const GRID_X = 224;
const GRID_Y = 110;

interface ComponentNodeData extends Record<string, unknown> {
  node: CanvasNode;
}

function ComponentNode({ data, selected }: NodeProps<Node<ComponentNodeData>>) {
  const spec = COMPONENT_CATALOG[data.node.type];
  const Icon = COMPONENT_ICONS[data.node.type];
  const filled = Object.entries(data.node.properties).filter(([, v]) => v.trim() !== "");
  return (
    <div
      className={cn(
        "border-border bg-surface w-48 rounded-lg border-2 px-3 py-2 shadow-sm",
        selected && "border-accent",
      )}
    >
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={
            { top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left }[side]
          }
          className="!bg-accent !size-2.5"
        />
      ))}
      <div className="flex items-center gap-2">
        <Icon aria-hidden className="text-accent size-4 shrink-0" />
        <span className="text-foreground truncate text-xs font-semibold">{data.node.label}</span>
      </div>
      {data.node.label !== spec.label && <p className="text-muted text-[10px]">{spec.label}</p>}
      {filled.length > 0 && (
        <ul className="text-muted mt-1 text-[10px] leading-tight">
          {filled.slice(0, 3).map(([key, value]) => (
            <li key={key} className="truncate">
              {spec.properties.find((p) => p.key === key)?.label ?? key}: {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const nodeTypes = { component: ComponentNode };

function download(filename: string, href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

function slugify(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "diagrama"
  );
}

type Selection = { kind: "node"; id: string } | { kind: "edge"; id: string } | null;

interface CanvasEditorProps {
  readonly document: DesignDocument;
  readonly onChange: (doc: DesignDocument) => void;
  /** Acciones adicionales en la barra (selector de documentos, importar, etc.). */
  readonly toolbar?: ReactNode;
  readonly heightClass?: string;
}

function Editor({ document: initial, onChange, toolbar, heightClass = "h-[36rem]" }: CanvasEditorProps) {
  const theme = useTheme();
  const flow = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState(initial);
  const [dragging, setDragging] = useState<Record<string, { x: number; y: number }>>({});
  const [selection, setSelection] = useState<Selection>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState({ source: "", target: "", kind: "sync" as ConnectionKind });
  const docRef = useRef(doc);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // El documento se toma una sola vez al montar: el editor es dueño de su estado mientras está abierto, y los
  // cambios que vuelven del store (por guardar) no deben reiniciarlo ni volver a disparar un guardado.
  const initialRef = useRef(initial);

  // Persistencia con un pequeño retardo: arrastrar o escribir no escribe en localStorage en cada evento.
  // El documento inicial no se guarda: sólo los cambios del usuario.
  useEffect(() => {
    if (doc === initialRef.current) return;
    const timer = window.setTimeout(() => onChangeRef.current(doc), 400);
    return () => window.clearTimeout(timer);
  }, [doc]);

  // Al desmontar (cambio de documento o de página) se guarda lo pendiente para no perder el último cambio.
  useEffect(
    () => () => {
      if (docRef.current !== initialRef.current) onChangeRef.current(docRef.current);
    },
    [],
  );

  /** Aplica un cambio de dominio sobre el documento más reciente (varios cambios en un mismo evento se encadenan). */
  const apply = (transform: (d: DesignDocument) => DesignDocument) => {
    try {
      const next = transform(docRef.current);
      docRef.current = next;
      setDoc(next);
      setError(null);
    } catch (e) {
      if (e instanceof CanvasLimitError) setError(e.message);
      else throw e;
    }
  };

  const nodes = useMemo<Node<ComponentNodeData>[]>(
    () =>
      doc.nodes.map((n) => ({
        id: n.id,
        type: "component",
        position: dragging[n.id] ?? n.position,
        selected: selection?.kind === "node" && selection.id === n.id,
        ariaLabel: `${COMPONENT_CATALOG[n.type].label}: ${n.label}`,
        data: { node: n },
      })),
    [doc.nodes, dragging, selection],
  );

  const edges = useMemo<Edge[]>(
    () =>
      doc.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || undefined,
        animated: e.kind === "async",
        selected: selection?.kind === "edge" && selection.id === e.id,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: e.kind === "async" ? { strokeDasharray: "6 4" } : undefined,
      })),
    [doc.edges, selection],
  );

  const onNodesChange = (changes: NodeChange<Node<ComponentNodeData>>[]) => {
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        const position = change.position;
        if (change.dragging) setDragging((d) => ({ ...d, [change.id]: position }));
        else apply((d) => updateNode(d, change.id, { position }, new Date()));
      }
      if (change.type === "position" && change.dragging === false) {
        const final = dragging[change.id];
        if (final) apply((d) => updateNode(d, change.id, { position: final }, new Date()));
        setDragging((d) => {
          const { [change.id]: _done, ...rest } = d;
          return rest;
        });
      }
      if (change.type === "remove") {
        apply((d) => removeNode(d, change.id, new Date()));
        setSelection(null);
      }
      if (change.type === "select" && change.selected) setSelection({ kind: "node", id: change.id });
    }
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === "remove") {
        apply((d) => removeEdge(d, change.id, new Date()));
        setSelection(null);
      }
      if (change.type === "select" && change.selected) setSelection({ kind: "edge", id: change.id });
    }
  };

  /**
   * Agrega un componente en la primera celda libre de una grilla anclada a la esquina visible del lienzo, para que
   * los componentes agregados con clic no se superpongan y queden a la vista.
   */
  const addAtCenter = (type: ComponentType) => {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const origin = bounds
      ? flow.screenToFlowPosition({ x: bounds.left + 32, y: bounds.top + 32 })
      : { x: 0, y: 0 };
    const columns = bounds ? Math.max(1, Math.floor((bounds.width - 64) / (GRID_X * flow.getZoom()))) : 3;
    const taken = (x: number, y: number) =>
      docRef.current.nodes.some(
        (n) => Math.abs(n.position.x - x) < GRID_X / 2 && Math.abs(n.position.y - y) < GRID_Y / 2,
      );
    let index = 0;
    let position = origin;
    do {
      position = {
        x: origin.x + (index % columns) * GRID_X,
        y: origin.y + Math.floor(index / columns) * GRID_Y,
      };
      index++;
    } while (taken(position.x, position.y) && index < 200);
    apply((d) => addNode(d, type, position, new Date()));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(DRAG_MIME) as ComponentType;
    if (!COMPONENT_TYPES.includes(type)) return;
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    apply((d) => addNode(d, type, { x: position.x - 96, y: position.y - 20 }, new Date()));
  };

  const exportPng = async () => {
    const viewportEl = wrapperRef.current?.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewportEl || doc.nodes.length === 0) return;
    const width = 1600;
    const height = 1000;
    const bounds = getNodesBounds(flow.getNodes());
    const viewport = getViewportForBounds(bounds, width, height, 0.2, 2, 0.1);
    const dataUrl = await toPng(viewportEl, {
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    });
    download(`${slugify(doc.title)}.png`, dataUrl);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(toExport(doc), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    download(`${slugify(doc.title)}.json`, url);
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const selectedNode = selection?.kind === "node" ? doc.nodes.find((n) => n.id === selection.id) : undefined;
  const selectedEdge = selection?.kind === "edge" ? doc.edges.find((e) => e.id === selection.id) : undefined;
  const labelOf = (id: string) => doc.nodes.find((n) => n.id === id)?.label ?? "?";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Nombre del diagrama"
          value={doc.title}
          maxLength={120}
          onChange={(e) =>
            apply((d) => ({ ...d, title: e.target.value, updatedAt: new Date().toISOString() }))
          }
          className="border-border bg-surface text-foreground w-64 rounded-md border px-2 py-1.5 text-sm font-medium"
        />
        {toolbar}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={exportJson}>
            <FileJson /> Exportar JSON
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void exportPng()}
            disabled={doc.nodes.length === 0}
          >
            <ImageDown /> Exportar imagen
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_17rem]">
        <section aria-label="Componentes" className="flex flex-col gap-1">
          <h3 className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">Componentes</h3>
          <p className="text-muted mb-1 text-[11px]">Hacé clic para agregar o arrastrá al lienzo.</p>
          <ul className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {COMPONENT_TYPES.map((type) => {
              const Icon = COMPONENT_ICONS[type];
              return (
                <li key={type}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_MIME, type);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => addAtCenter(type)}
                    title={COMPONENT_CATALOG[type].description}
                    aria-label={`Agregar ${COMPONENT_CATALOG[type].label}`}
                    className="border-border bg-surface hover:bg-surface-2 text-foreground flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs"
                  >
                    <Icon aria-hidden className="text-accent size-3.5 shrink-0" />
                    {COMPONENT_CATALOG[type].label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div
          ref={wrapperRef}
          className={cn("border-border bg-background relative rounded-lg border", heightClass)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            colorMode={theme}
            connectionMode={ConnectionMode.Loose}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(c) => apply((d) => connect(d, c.source, c.target, "sync", "", new Date()))}
            onPaneClick={() => setSelection(null)}
            deleteKeyCode={["Delete", "Backspace"]}
            fitView={initial.nodes.length > 0}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            fitViewOptions={{ maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls />
          </ReactFlow>
          {doc.nodes.length === 0 && (
            <p className="text-muted pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm">
              Agregá componentes desde la izquierda y conectalos arrastrando desde un punto de un componente a
              otro.
            </p>
          )}
        </div>

        <aside
          aria-label="Propiedades"
          className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3"
        >
          {selectedNode ? (
            <NodeInspector
              key={selectedNode.id}
              node={selectedNode}
              onChange={(patch) => apply((d) => updateNode(d, selectedNode.id, patch, new Date()))}
              onDelete={() => {
                apply((d) => removeNode(d, selectedNode.id, new Date()));
                setSelection(null);
              }}
            />
          ) : selectedEdge ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-foreground text-sm font-semibold">
                Conexión: {labelOf(selectedEdge.source)} → {labelOf(selectedEdge.target)}
              </h3>
              <label className="text-muted flex flex-col gap-1 text-xs">
                Tipo
                <select
                  value={selectedEdge.kind}
                  onChange={(e) =>
                    apply((d) =>
                      updateEdge(d, selectedEdge.id, { kind: e.target.value as ConnectionKind }, new Date()),
                    )
                  }
                  className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
                >
                  <option value="sync">Síncrona (request/response)</option>
                  <option value="async">Asíncrona (mensaje/evento)</option>
                </select>
              </label>
              <label className="text-muted flex flex-col gap-1 text-xs">
                Etiqueta
                <input
                  value={selectedEdge.label}
                  maxLength={80}
                  onChange={(e) =>
                    apply((d) => updateEdge(d, selectedEdge.id, { label: e.target.value }, new Date()))
                  }
                  placeholder="p. ej. POST /payments, PaymentRegistered"
                  className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  apply((d) => removeEdge(d, selectedEdge.id, new Date()));
                  setSelection(null);
                }}
              >
                <Trash2 /> Eliminar conexión
              </Button>
            </div>
          ) : (
            <p className="text-muted text-xs">
              Seleccioná un componente o una conexión para editar sus propiedades. Las propiedades son
              conceptuales: sirven para explicar el diseño, no configuran infraestructura real.
            </p>
          )}

          {doc.nodes.length >= 2 && (
            <form
              className="border-border flex flex-col gap-2 border-t pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                apply((d) =>
                  connect(d, connectForm.source, connectForm.target, connectForm.kind, "", new Date()),
                );
              }}
            >
              <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                <Link2 aria-hidden className="size-3.5" /> Conectar componentes
              </h3>
              {(["source", "target"] as const).map((field) => (
                <label key={field} className="text-muted flex flex-col gap-1 text-xs">
                  {field === "source" ? "Desde" : "Hacia"}
                  <select
                    value={connectForm[field]}
                    onChange={(e) => setConnectForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
                  >
                    <option value="">Elegir…</option>
                    {doc.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="text-muted flex flex-col gap-1 text-xs">
                Tipo
                <select
                  value={connectForm.kind}
                  onChange={(e) => setConnectForm((f) => ({ ...f, kind: e.target.value as ConnectionKind }))}
                  className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
                >
                  <option value="sync">Síncrona</option>
                  <option value="async">Asíncrona</option>
                </select>
              </label>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={
                  !connectForm.source || !connectForm.target || connectForm.source === connectForm.target
                }
              >
                Conectar
              </Button>
            </form>
          )}
        </aside>
      </div>

      <details className="border-border bg-surface rounded-lg border">
        <summary className="text-foreground cursor-pointer px-4 py-2 text-sm font-medium">
          Resumen en texto del diseño
        </summary>
        <pre className="text-foreground border-border overflow-x-auto border-t px-4 py-3 text-xs whitespace-pre-wrap">
          {describeDesign(doc)}
        </pre>
      </details>
    </div>
  );
}

function NodeInspector({
  node,
  onChange,
  onDelete,
}: {
  node: CanvasNode;
  onChange: (patch: Partial<Pick<CanvasNode, "label" | "description" | "properties">>) => void;
  onDelete: () => void;
}) {
  const spec = COMPONENT_CATALOG[node.type];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted text-xs">{spec.label}</p>
      <label className="text-muted flex flex-col gap-1 text-xs">
        Nombre
        <input
          value={node.label}
          maxLength={80}
          onChange={(e) => onChange({ label: e.target.value })}
          className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
        />
      </label>
      <label className="text-muted flex flex-col gap-1 text-xs">
        Responsabilidad / descripción
        <textarea
          value={node.description}
          maxLength={500}
          rows={3}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={spec.description}
          className="border-border bg-background text-foreground resize-y rounded-md border px-2 py-1 text-sm"
        />
      </label>
      {spec.properties.map((property) => (
        <label key={property.key} className="text-muted flex flex-col gap-1 text-xs">
          {property.label}
          {property.options ? (
            <select
              value={node.properties[property.key] ?? ""}
              onChange={(e) =>
                onChange({ properties: { ...node.properties, [property.key]: e.target.value } })
              }
              className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
            >
              <option value="">Sin definir</option>
              {property.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={node.properties[property.key] ?? ""}
              maxLength={500}
              placeholder={property.placeholder}
              onChange={(e) =>
                onChange({ properties: { ...node.properties, [property.key]: e.target.value } })
              }
              className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
            />
          )}
        </label>
      ))}
      <Button size="sm" variant="ghost" onClick={onDelete}>
        <Trash2 /> Eliminar componente
      </Button>
    </div>
  );
}

/**
 * Editor visual del Architecture Canvas (React Flow). Recibe un documento y notifica cambios con un retardo
 * corto; quien lo usa decide dónde se guarda (diagramas libres o el diagrama de un challenge). Para cambiar de
 * documento, montarlo con otra `key`.
 */
export function CanvasEditor(props: CanvasEditorProps) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}
