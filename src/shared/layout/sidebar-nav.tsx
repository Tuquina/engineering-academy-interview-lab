"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_SECTIONS, SECTION_GROUPS } from "@/shared/navigation/main-sections";
import { cn } from "@/shared/lib/cn";

/** Enlace a un curso del catálogo; la lista se genera desde el contenido, no está fija en el código. */
export interface CourseNavLink {
  readonly href: string;
  readonly title: string;
  readonly lessonCount: number;
  /** Clase de tono del área del curso (`area-tone-N`): pinta el punto de color junto al título. */
  readonly toneClass: string;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const ITEM_CLASS =
  "flex items-center gap-3 rounded-md px-3 py-1.5 transition-colors focus-visible:outline-offset-0";

/**
 * Navegación principal, agrupada en Aprender, Practicar, Entrevistas y Tu progreso; cada grupo tiene el color de
 * sus íconos. Las secciones planificadas se muestran deshabilitadas con su fase prevista.
 */
export function SidebarNav({
  courses,
  onNavigate,
}: {
  courses: readonly CourseNavLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-5 text-sm">
      {SECTION_GROUPS.map((group) => {
        const sections = MAIN_SECTIONS.filter((section) => section.group === group.id);
        if (sections.length === 0) return null;
        return (
          <div key={group.id} className={`area-tone-${group.tone}`}>
            <p className="text-muted px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {sections.map((section) => {
                const Icon = section.icon;
                if (section.status === "planned") {
                  return (
                    <li key={section.id}>
                      <span
                        aria-disabled="true"
                        title={`Disponible a partir de la Fase ${section.phase}`}
                        className={cn(ITEM_CLASS, "text-muted/60 cursor-not-allowed")}
                      >
                        <Icon aria-hidden className="size-4 shrink-0" />
                        <span className="truncate">{section.label}</span>
                        <span className="bg-surface-2 text-muted ml-auto rounded px-1.5 text-[10px] font-medium">
                          F{section.phase}
                        </span>
                      </span>
                    </li>
                  );
                }
                const active = isActive(pathname, section.href);
                return (
                  <li key={section.id}>
                    <Link
                      href={section.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        ITEM_CLASS,
                        "relative",
                        active
                          ? "bg-area/12 text-foreground before:bg-area font-medium before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full"
                          : "text-muted hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <Icon aria-hidden className="text-area size-4 shrink-0" />
                      <span className="truncate">{section.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {courses.length > 0 && (
        <details open className="group/courses">
          <summary className="text-muted hover:text-foreground flex cursor-pointer list-none items-center gap-1 rounded-md px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase marker:hidden [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-3 transition-transform group-open/courses:rotate-90" />
            Cursos
          </summary>
          <ul className="flex flex-col gap-0.5">
            {courses.map((course) => {
              const active = isActive(pathname, course.href);
              return (
                <li key={course.href} className={course.toneClass}>
                  <Link
                    href={course.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      ITEM_CLASS,
                      "justify-between gap-2",
                      active
                        ? "bg-area/12 text-foreground font-medium"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <span aria-hidden className="bg-area size-2 shrink-0 rounded-full" />
                    <span className="min-w-0 flex-1 truncate">{course.title}</span>
                    <span className="text-muted text-xs tabular-nums">{course.lessonCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </nav>
  );
}
