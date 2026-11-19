import { z } from "zod";
import {
  COMPONENT_TYPES,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  MAX_EDGES,
  MAX_NODES,
  MAX_TEXT,
  type DesignDocument,
} from "../domain/canvas";

const nodeSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(COMPONENT_TYPES),
  label: z.string().max(80),
  description: z.string().max(MAX_TEXT),
  properties: z.record(z.string().max(40), z.string().max(MAX_TEXT)),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
});

const edgeSchema = z.object({
  id: z.string().min(1).max(40),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.enum(["sync", "async"]),
  label: z.string().max(80),
});

/** Esquema de un documento guardado (lo reutiliza el store local). */
export const designDocumentSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().max(120),
  nodes: z.array(nodeSchema).max(MAX_NODES),
  edges: z.array(edgeSchema).max(MAX_EDGES),
  updatedAt: z.iso.datetime(),
});

const exportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  title: z.string().max(120),
  nodes: z.array(nodeSchema).max(MAX_NODES),
  edges: z.array(edgeSchema).max(MAX_EDGES),
});

export type ImportResult = { ok: true; document: DesignDocument } | { ok: false; error: string };

/**
 * Valida un JSON exportado por el canvas y lo convierte en un documento nuevo. Descarta conexiones que apunten a
 * componentes inexistentes (un archivo editado a mano no debe romper el editor).
 */
export function importDesign(raw: string, id: string, now: Date): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "El archivo no es JSON válido." };
  }
  const parsed = exportSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "El archivo no tiene el formato exportado por el Architecture Canvas." };
  }
  const nodeIds = new Set(parsed.data.nodes.map((n) => n.id));
  return {
    ok: true,
    document: {
      id,
      title: parsed.data.title || "Diagrama importado",
      nodes: parsed.data.nodes,
      edges: parsed.data.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)),
      updatedAt: now.toISOString(),
    },
  };
}
