import {
  BarChart3,
  Bookmark,
  BookOpen,
  Bot,
  Boxes,
  Code2,
  Database,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  MessagesSquare,
  Network,
  Settings,
  Shield,
  Swords,
  type LucideIcon,
} from "lucide-react";

/**
 * Secciones de la navegación principal (MASTER_PROMPT §6).
 *
 * `planned` indica una sección que todavía no existe: se muestra deshabilitada con la fase prevista en lugar de
 * enlazar a una página vacía o simulada. Al implementarla basta con cambiar su estado a `available`.
 */
export type MainSection = {
  readonly id: string;
  readonly group: SectionGroupId;
  readonly label: string;
  readonly icon: LucideIcon;
} & (
  | { readonly status: "available"; readonly href: string }
  | { readonly status: "planned"; readonly phase: number }
);

export type SectionGroupId = "learn" | "practice" | "interview" | "you";

/**
 * Grupos de la barra lateral, en orden. `tone` es el tono de la paleta (`area-tone-N`) de sus íconos: ayuda a ubicar
 * de un vistazo si una sección es para estudiar, practicar o entrevistar.
 */
export const SECTION_GROUPS: ReadonlyArray<{ id: SectionGroupId; label: string; tone: number }> = [
  { id: "learn", label: "Aprender", tone: 1 },
  { id: "practice", label: "Practicar", tone: 6 },
  { id: "interview", label: "Entrevistas", tone: 5 },
  { id: "you", label: "Tu progreso", tone: 4 },
];

export const MAIN_SECTIONS: readonly MainSection[] = [
  {
    id: "dashboard",
    group: "learn",
    label: "Dashboard",
    icon: LayoutDashboard,
    status: "available",
    href: "/",
  },
  {
    id: "paths",
    group: "learn",
    label: "Rutas de aprendizaje",
    icon: MapIcon,
    status: "available",
    href: "/paths",
  },
  {
    id: "library",
    group: "learn",
    label: "Biblioteca",
    icon: BookOpen,
    status: "available",
    href: "/library",
  },
  {
    id: "saved",
    group: "learn",
    label: "Guardados y notas",
    icon: Bookmark,
    status: "available",
    href: "/saved",
  },
  {
    id: "code-lab",
    group: "practice",
    label: "Laboratorio de código",
    icon: Code2,
    status: "available",
    href: "/lab",
  },
  {
    id: "challenges",
    group: "practice",
    label: "Challenges",
    icon: Swords,
    status: "available",
    href: "/challenges",
  },
  {
    id: "patterns",
    group: "practice",
    label: "Patrones y arquitectura",
    icon: Layers,
    status: "available",
    href: "/patterns",
  },
  {
    id: "system-design",
    group: "practice",
    label: "System Design Studio",
    icon: Network,
    status: "available",
    href: "/system-design",
  },
  {
    id: "agents-lab",
    group: "practice",
    label: "AI Agents Lab",
    icon: Bot,
    status: "available",
    href: "/agents",
  },
  {
    id: "database-lab",
    group: "practice",
    label: "Database Lab",
    icon: Database,
    status: "available",
    href: "/database-lab",
  },
  {
    id: "interview-arena",
    group: "interview",
    label: "Interview Arena",
    icon: MessagesSquare,
    status: "available",
    href: "/interview",
  },
  {
    id: "mentor",
    group: "interview",
    label: "AI Study Mentor",
    icon: GraduationCap,
    status: "available",
    href: "/mentor",
  },
  {
    id: "flashcards",
    group: "learn",
    label: "Flashcards",
    icon: Boxes,
    status: "available",
    href: "/flashcards",
  },
  {
    id: "cheatsheets",
    group: "learn",
    label: "Cheatsheets",
    icon: FileText,
    status: "available",
    href: "/cheatsheets",
  },
  {
    id: "stats",
    group: "you",
    label: "Estadísticas y progreso",
    icon: BarChart3,
    status: "available",
    href: "/stats",
  },
  {
    id: "admin",
    group: "you",
    label: "Administración de contenido",
    icon: Shield,
    status: "available",
    href: "/admin",
  },
  {
    id: "settings",
    group: "you",
    label: "Configuración",
    icon: Settings,
    status: "available",
    href: "/settings",
  },
];
