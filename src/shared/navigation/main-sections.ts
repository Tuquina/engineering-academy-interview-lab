import {
  BarChart3,
  Bookmark,
  BookOpen,
  Bot,
  Boxes,
  Code2,
  Database,
  FileText,
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
export type MainSection =
  | {
      readonly id: string;
      readonly label: string;
      readonly icon: LucideIcon;
      readonly status: "available";
      readonly href: string;
    }
  | {
      readonly id: string;
      readonly label: string;
      readonly icon: LucideIcon;
      readonly status: "planned";
      readonly phase: number;
    };

export const MAIN_SECTIONS: readonly MainSection[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, status: "available", href: "/" },
  { id: "paths", label: "Rutas de aprendizaje", icon: MapIcon, status: "available", href: "/paths" },
  { id: "library", label: "Biblioteca", icon: BookOpen, status: "available", href: "/library" },
  { id: "saved", label: "Guardados y notas", icon: Bookmark, status: "available", href: "/saved" },
  { id: "code-lab", label: "Laboratorio de código", icon: Code2, status: "available", href: "/lab" },
  { id: "challenges", label: "Challenges", icon: Swords, status: "available", href: "/challenges" },
  { id: "patterns", label: "Patrones y arquitectura", icon: Layers, status: "available", href: "/patterns" },
  {
    id: "system-design",
    label: "System Design Studio",
    icon: Network,
    status: "available",
    href: "/system-design",
  },
  { id: "agents-lab", label: "AI Agents Lab", icon: Bot, status: "planned", phase: 5 },
  { id: "database-lab", label: "Database Lab", icon: Database, status: "available", href: "/database-lab" },
  {
    id: "interview-arena",
    label: "Interview Arena",
    icon: MessagesSquare,
    status: "available",
    href: "/interview",
  },
  { id: "flashcards", label: "Flashcards", icon: Boxes, status: "available", href: "/flashcards" },
  { id: "cheatsheets", label: "Cheatsheets", icon: FileText, status: "available", href: "/cheatsheets" },
  { id: "stats", label: "Estadísticas y progreso", icon: BarChart3, status: "available", href: "/stats" },
  { id: "admin", label: "Administración de contenido", icon: Shield, status: "planned", phase: 6 },
  { id: "settings", label: "Configuración", icon: Settings, status: "available", href: "/settings" },
];
