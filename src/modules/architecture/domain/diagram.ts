/**
 * Diagrama de arquitectura interactivo (MASTER_PROMPT §14.4 y §26): nodos con responsabilidad y ejemplos de
 * implementación, conexiones tipadas y, opcionalmente, un recorrido paso a paso que resalta nodos y conexiones.
 */

export type DiagramNodeKind =
  | "actor"
  | "ui"
  | "service"
  | "domain"
  | "port"
  | "adapter"
  | "database"
  | "queue"
  | "cache"
  | "external"
  | "worker"
  | "boundary";

/** Tipo de relación: llamada síncrona, mensaje asíncrono o dependencia de código (dirección de imports). */
export type DiagramEdgeKind = "sync" | "async" | "dependency";

export const DIAGRAM_EDGE_LABELS: Readonly<Record<DiagramEdgeKind, string>> = {
  sync: "Llamada síncrona",
  async: "Mensaje asíncrono",
  dependency: "Dependencia de código",
};

export interface DiagramNode {
  readonly id: string;
  readonly label: string;
  readonly kind: DiagramNodeKind;
  /** Posición en una grilla lógica (columnas y filas), independiente de píxeles. */
  readonly column: number;
  readonly row: number;
  readonly responsibility: string;
  readonly examples: readonly string[];
  /** Nodo contenedor (para agrupar, p. ej. un módulo o un límite de servicio). */
  readonly parent?: string;
}

export interface DiagramEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: DiagramEdgeKind;
  readonly label?: string;
}

export interface DiagramStep {
  readonly title: string;
  readonly description: string;
  /** IDs de nodos y conexiones resaltados en este paso. */
  readonly highlight: readonly string[];
}

export interface ArchitectureDiagram {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly kind: "architecture" | "sequence-flow" | "dependency";
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
  readonly steps: readonly DiagramStep[];
  readonly tags: readonly string[];
}

/**
 * Verifica la integridad de un diagrama: IDs únicos, conexiones y padres que referencian nodos existentes y pasos
 * que sólo resaltan elementos existentes. Devuelve la lista de problemas (vacía si es válido).
 */
export function validateDiagram(diagram: ArchitectureDiagram): string[] {
  const problems: string[] = [];
  const nodeIds = new Set<string>();
  for (const node of diagram.nodes) {
    if (nodeIds.has(node.id)) problems.push(`Nodo duplicado: ${node.id}`);
    nodeIds.add(node.id);
  }
  for (const node of diagram.nodes) {
    if (node.parent && !nodeIds.has(node.parent))
      problems.push(`Padre inexistente en ${node.id}: ${node.parent}`);
  }
  const elementIds = new Set(nodeIds);
  for (const edge of diagram.edges) {
    if (elementIds.has(edge.id)) problems.push(`ID de conexión duplicado: ${edge.id}`);
    elementIds.add(edge.id);
    if (!nodeIds.has(edge.from)) problems.push(`Conexión ${edge.id}: origen inexistente ${edge.from}`);
    if (!nodeIds.has(edge.to)) problems.push(`Conexión ${edge.id}: destino inexistente ${edge.to}`);
  }
  diagram.steps.forEach((step, index) => {
    for (const id of step.highlight) {
      if (!elementIds.has(id)) problems.push(`Paso ${index + 1}: elemento inexistente ${id}`);
    }
  });
  return problems;
}
