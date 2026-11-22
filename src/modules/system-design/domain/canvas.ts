/**
 * Architecture Canvas (MASTER_PROMPT §15.2): documento de diseño con componentes conceptuales, conexiones y
 * propiedades. Es un modelo de dominio puro y serializable; la presentación lo dibuja con React Flow.
 */

export const COMPONENT_TYPES = [
  "web-client",
  "api-gateway",
  "load-balancer",
  "service",
  "postgres",
  "redis",
  "queue",
  "worker",
  "external-api",
  "object-storage",
  "observability",
  "llm-provider",
  "webhook-endpoint",
  "scheduler",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

/** Propiedad conceptual configurable de un componente (no es configuración real de infraestructura). */
export interface PropertySpec {
  readonly key: string;
  readonly label: string;
  readonly options?: readonly string[];
  readonly placeholder?: string;
}

export interface ComponentSpec {
  readonly type: ComponentType;
  readonly label: string;
  readonly description: string;
  readonly properties: readonly PropertySpec[];
}

const replicas: PropertySpec = {
  key: "replicas",
  label: "Réplicas",
  placeholder: "p. ej. 3, autoescalado 2–10",
};

export const COMPONENT_CATALOG: Readonly<Record<ComponentType, ComponentSpec>> = {
  "web-client": {
    type: "web-client",
    label: "Cliente web",
    description: "Navegador, app móvil o integración que consume la API.",
    properties: [{ key: "channel", label: "Canal", placeholder: "panel de operadores, app, API de tenant" }],
  },
  "api-gateway": {
    type: "api-gateway",
    label: "API Gateway",
    description: "Punto de entrada: autenticación, rate limiting, enrutamiento.",
    properties: [
      { key: "auth", label: "Autenticación", options: ["API key", "OAuth 2.0 / JWT", "mTLS", "Sesión"] },
      { key: "rateLimit", label: "Rate limit", placeholder: "p. ej. 100 req/s por tenant" },
    ],
  },
  "load-balancer": {
    type: "load-balancer",
    label: "Load balancer",
    description: "Distribuye tráfico entre réplicas sin estado.",
    properties: [
      {
        key: "algorithm",
        label: "Algoritmo",
        options: ["Round robin", "Least connections", "Hash consistente"],
      },
      { key: "healthCheck", label: "Health check", placeholder: "GET /health cada 10 s" },
    ],
  },
  service: {
    type: "service",
    label: "Servicio backend",
    description: "Lógica de negocio expuesta por HTTP o consumiendo mensajes.",
    properties: [
      replicas,
      { key: "state", label: "Estado", options: ["Stateless", "Stateful"] },
      { key: "runtime", label: "Runtime", placeholder: "Node.js en Vercel Functions, contenedor…" },
    ],
  },
  postgres: {
    type: "postgres",
    label: "PostgreSQL",
    description: "Base relacional transaccional.",
    properties: [
      {
        key: "replication",
        label: "Replicación",
        options: ["Sin réplicas", "Réplicas de lectura", "Alta disponibilidad"],
      },
      { key: "partitioning", label: "Particionado", placeholder: "p. ej. por tenant_id o por mes" },
      { key: "consistency", label: "Consistencia", options: ["Fuerte (primaria)", "Eventual (réplicas)"] },
    ],
  },
  redis: {
    type: "redis",
    label: "Redis",
    description: "Caché, rate limiting, locks o colas livianas.",
    properties: [
      {
        key: "usage",
        label: "Uso",
        options: ["Caché", "Rate limiting", "Lock distribuido", "Cola", "Sesiones"],
      },
      { key: "ttl", label: "TTL / expiración", placeholder: "p. ej. 5 min" },
      {
        key: "eviction",
        label: "Política de desalojo",
        options: ["allkeys-lru", "volatile-ttl", "noeviction"],
      },
    ],
  },
  queue: {
    type: "queue",
    label: "Cola de mensajes",
    description: "Desacopla productores y consumidores; absorbe picos.",
    properties: [
      { key: "delivery", label: "Entrega", options: ["Al menos una vez", "Como máximo una vez"] },
      { key: "ordering", label: "Orden", options: ["Sin garantía", "FIFO por clave", "FIFO global"] },
      { key: "dlq", label: "DLQ", options: ["Sí, tras N reintentos", "No"] },
    ],
  },
  worker: {
    type: "worker",
    label: "Workers",
    description: "Procesan trabajos en segundo plano.",
    properties: [
      replicas,
      { key: "concurrency", label: "Concurrencia", placeholder: "p. ej. 10 trabajos por réplica" },
      { key: "idempotency", label: "Idempotencia", placeholder: "p. ej. por eventId en tabla inbox" },
    ],
  },
  "external-api": {
    type: "external-api",
    label: "API externa",
    description: "Proveedor de terceros: pasarela de pagos, mensajería, bureau de crédito.",
    properties: [
      { key: "sla", label: "SLA del proveedor", placeholder: "p. ej. 99,9%" },
      {
        key: "resilience",
        label: "Resiliencia",
        placeholder: "timeout 3 s, retry con backoff, circuit breaker",
      },
    ],
  },
  "object-storage": {
    type: "object-storage",
    label: "Object storage",
    description: "Archivos: importaciones, adjuntos, exportaciones.",
    properties: [
      { key: "retention", label: "Retención", placeholder: "p. ej. 90 días" },
      { key: "access", label: "Acceso", options: ["Privado con URLs firmadas", "Público"] },
    ],
  },
  observability: {
    type: "observability",
    label: "Observabilidad",
    description: "Logs, métricas y trazas.",
    properties: [
      {
        key: "signals",
        label: "Señales",
        options: ["Logs + métricas + trazas", "Logs + métricas", "Sólo logs"],
      },
      { key: "slo", label: "SLO principal", placeholder: "p. ej. p95 < 300 ms en /payments" },
    ],
  },
  "llm-provider": {
    type: "llm-provider",
    label: "Proveedor de LLM",
    description: "Modelo de lenguaje usado por agentes o clasificadores.",
    properties: [
      { key: "fallback", label: "Fallback", placeholder: "otro modelo, respuesta determinista, humano" },
      { key: "limits", label: "Límites", placeholder: "tokens por minuto, costo por conversación" },
    ],
  },
  "webhook-endpoint": {
    type: "webhook-endpoint",
    label: "Webhook endpoint",
    description: "Recibe eventos de terceros o los envía a clientes.",
    properties: [
      { key: "signature", label: "Firma", options: ["HMAC con secreto compartido", "Sin firma"] },
      { key: "ack", label: "Respuesta", options: ["202 y procesar asíncrono", "200 tras procesar"] },
    ],
  },
  scheduler: {
    type: "scheduler",
    label: "Scheduler",
    description: "Dispara trabajos periódicos o programados.",
    properties: [
      {
        key: "schedule",
        label: "Programación",
        placeholder: "p. ej. cada 5 min, 09:00 hora local del paciente",
      },
      { key: "overlap", label: "Solapamiento", options: ["Evitar con lock", "Permitir"] },
    ],
  },
};

export interface CanvasNode {
  readonly id: string;
  readonly type: ComponentType;
  readonly label: string;
  readonly description: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly position: { readonly x: number; readonly y: number };
}

export type ConnectionKind = "sync" | "async";

export interface CanvasEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: ConnectionKind;
  readonly label: string;
}

export interface DesignDocument {
  readonly id: string;
  readonly title: string;
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
  readonly updatedAt: string;
}

export const MAX_NODES = 80;
export const MAX_EDGES = 160;
export const MAX_TEXT = 500;

/** Formato de exportación JSON, versionado para poder importarlo en el futuro. */
export const EXPORT_FORMAT = "eal-architecture-canvas";
export const EXPORT_VERSION = 1;

export interface ExportedDesign {
  readonly format: typeof EXPORT_FORMAT;
  readonly version: typeof EXPORT_VERSION;
  readonly title: string;
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
}

export function createDocument(id: string, title: string, now: Date): DesignDocument {
  return { id, title: title.slice(0, 120), nodes: [], edges: [], updatedAt: now.toISOString() };
}

function nextId(prefix: string, existing: ReadonlyArray<{ id: string }>): string {
  const used = new Set(existing.map((e) => e.id));
  let index = existing.length + 1;
  while (used.has(`${prefix}-${index}`)) index++;
  return `${prefix}-${index}`;
}

export class CanvasLimitError extends Error {}

/** Agrega un componente del catálogo. La posición la decide la presentación (centro visible o punto de drop). */
export function addNode(
  doc: DesignDocument,
  type: ComponentType,
  position: { x: number; y: number },
  now: Date,
): DesignDocument {
  if (doc.nodes.length >= MAX_NODES)
    throw new CanvasLimitError(`Máximo ${MAX_NODES} componentes por diagrama.`);
  const spec = COMPONENT_CATALOG[type];
  const sameType = doc.nodes.filter((n) => n.type === type).length;
  const node: CanvasNode = {
    id: nextId("n", doc.nodes),
    type,
    label: sameType === 0 ? spec.label : `${spec.label} ${sameType + 1}`,
    description: "",
    properties: {},
    position: { x: Math.round(position.x), y: Math.round(position.y) },
  };
  return { ...doc, nodes: [...doc.nodes, node], updatedAt: now.toISOString() };
}

export function updateNode(
  doc: DesignDocument,
  nodeId: string,
  patch: Partial<Pick<CanvasNode, "label" | "description" | "properties" | "position">>,
  now: Date,
): DesignDocument {
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            ...patch,
            label: (patch.label ?? n.label).slice(0, 80),
            description: (patch.description ?? n.description).slice(0, MAX_TEXT),
          }
        : n,
    ),
    updatedAt: now.toISOString(),
  };
}

/** Elimina un componente y todas sus conexiones. */
export function removeNode(doc: DesignDocument, nodeId: string, now: Date): DesignDocument {
  return {
    ...doc,
    nodes: doc.nodes.filter((n) => n.id !== nodeId),
    edges: doc.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    updatedAt: now.toISOString(),
  };
}

/**
 * Conecta dos componentes. Ignora conexiones a sí mismo, duplicadas (mismo origen y destino) o hacia componentes
 * inexistentes, y devuelve el documento sin cambios en esos casos.
 */
export function connect(
  doc: DesignDocument,
  source: string,
  target: string,
  kind: ConnectionKind,
  label: string,
  now: Date,
): DesignDocument {
  const ids = new Set(doc.nodes.map((n) => n.id));
  if (source === target || !ids.has(source) || !ids.has(target)) return doc;
  if (doc.edges.some((e) => e.source === source && e.target === target)) return doc;
  if (doc.edges.length >= MAX_EDGES)
    throw new CanvasLimitError(`Máximo ${MAX_EDGES} conexiones por diagrama.`);
  const edge: CanvasEdge = { id: nextId("e", doc.edges), source, target, kind, label: label.slice(0, 80) };
  return { ...doc, edges: [...doc.edges, edge], updatedAt: now.toISOString() };
}

export function updateEdge(
  doc: DesignDocument,
  edgeId: string,
  patch: Partial<Pick<CanvasEdge, "kind" | "label">>,
  now: Date,
): DesignDocument {
  return {
    ...doc,
    edges: doc.edges.map((e) =>
      e.id === edgeId ? { ...e, ...patch, label: (patch.label ?? e.label).slice(0, 80) } : e,
    ),
    updatedAt: now.toISOString(),
  };
}

export function removeEdge(doc: DesignDocument, edgeId: string, now: Date): DesignDocument {
  return { ...doc, edges: doc.edges.filter((e) => e.id !== edgeId), updatedAt: now.toISOString() };
}

export function toExport(doc: DesignDocument): ExportedDesign {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    title: doc.title,
    nodes: doc.nodes,
    edges: doc.edges,
  };
}

/** Resumen textual del diseño (útil para revisar, para lectores de pantalla y para pegar en notas). */
export function describeDesign(doc: DesignDocument): string {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const lines = doc.nodes.map((n) => {
    const props = Object.entries(n.properties)
      .filter(([, v]) => v.trim() !== "")
      .map(([k, v]) => `${COMPONENT_CATALOG[n.type].properties.find((p) => p.key === k)?.label ?? k}: ${v}`);
    return `- ${n.label} (${COMPONENT_CATALOG[n.type].label})${props.length ? ` — ${props.join("; ")}` : ""}`;
  });
  const flows = doc.edges.map((e) => {
    const arrow = e.kind === "async" ? "⇢" : "→";
    return `- ${byId.get(e.source)?.label ?? "?"} ${arrow} ${byId.get(e.target)?.label ?? "?"}${e.label ? ` (${e.label})` : ""}`;
  });
  return [
    `Componentes (${doc.nodes.length}):`,
    ...lines,
    "",
    `Conexiones (${doc.edges.length}):`,
    ...flows,
  ].join("\n");
}
