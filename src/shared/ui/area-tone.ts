import {
  BookOpen,
  Bot,
  Braces,
  Database,
  Layers,
  MonitorSmartphone,
  Network,
  Server,
  type LucideIcon,
} from "lucide-react";

/**
 * Color de cada área de conocimiento. Las áreas se definen en `content/areas.json`; este mapa sólo asigna uno de los
 * siete tonos de la paleta (`--area-1` … `--area-7` en `globals.css`). Un área nueva sin entrada recibe un tono
 * estable derivado de su ID, así que agregar contenido no requiere tocar código.
 */
const AREA_TONES: Readonly<Record<string, number>> = {
  "languages-runtime": 1,
  frontend: 2,
  architecture: 3,
  "system-design": 4,
  "ai-agents": 5,
  data: 6,
  "backend-languages": 7,
};

const TONE_COUNT = 7;

/** Número de tono (1–7) del área. */
export function areaTone(areaId: string | undefined): number {
  if (!areaId) return 1;
  const known = AREA_TONES[areaId];
  if (known) return known;
  let hash = 0;
  for (const char of areaId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % TONE_COUNT) + 1;
}

const AREA_ICONS: Readonly<Record<string, LucideIcon>> = {
  "languages-runtime": Braces,
  frontend: MonitorSmartphone,
  architecture: Layers,
  "system-design": Network,
  "ai-agents": Bot,
  data: Database,
  "backend-languages": Server,
};

/** Ícono que identifica al área junto a su color; las áreas sin ícono propio usan un libro. */
export function areaIcon(areaId: string | undefined): LucideIcon {
  return (areaId && AREA_ICONS[areaId]) || BookOpen;
}

/**
 * Clase que expone el color del área como `--area` para los descendientes (`text-area`, `bg-area/10`,
 * `border-area/40`).
 */
export function areaToneClass(areaId: string | undefined): string {
  return `area-tone-${areaTone(areaId)}`;
}
