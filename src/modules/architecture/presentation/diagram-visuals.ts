import {
  Box,
  Cable,
  Cog,
  Database,
  Globe,
  Hexagon,
  Inbox,
  Monitor,
  Plug,
  Server,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { DiagramNodeKind } from "../domain/diagram";

/** Icono, etiqueta y color de borde por tipo de nodo (compartido por diagramas de patrones y el canvas). */
export const NODE_KIND_VISUALS: Readonly<
  Record<DiagramNodeKind, { icon: LucideIcon; label: string; className: string }>
> = {
  actor: { icon: User, label: "Actor", className: "border-muted/60" },
  ui: { icon: Monitor, label: "Interfaz", className: "border-accent/60" },
  service: { icon: Server, label: "Servicio", className: "border-accent/60" },
  domain: { icon: Hexagon, label: "Dominio", className: "border-violet/70" },
  port: { icon: Plug, label: "Puerto", className: "border-violet/50" },
  adapter: { icon: Cable, label: "Adaptador", className: "border-success/60" },
  database: { icon: Database, label: "Base de datos", className: "border-warning/60" },
  queue: { icon: Inbox, label: "Cola / broker", className: "border-warning/60" },
  cache: { icon: Zap, label: "Caché", className: "border-danger/50" },
  external: { icon: Globe, label: "Sistema externo", className: "border-muted/60" },
  worker: { icon: Cog, label: "Worker", className: "border-success/60" },
  boundary: { icon: Box, label: "Límite", className: "border-border" },
};
