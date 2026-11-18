"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_SECTIONS } from "@/shared/navigation/main-sections";
import { cn } from "@/shared/lib/cn";

/** Enlace a un curso del catálogo; la lista se genera desde el contenido, no está fija en el código. */
export interface CourseNavLink {
  readonly href: string;
  readonly title: string;
  readonly lessonCount: number;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navegación principal. Las secciones planificadas se muestran deshabilitadas con su fase prevista. */
export function SidebarNav({
  courses,
  onNavigate,
}: {
  courses: readonly CourseNavLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-6 text-sm">
      <ul className="flex flex-col gap-0.5">
        {MAIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          if (section.status === "planned") {
            return (
              <li key={section.id}>
                <span
                  aria-disabled="true"
                  title={`Disponible a partir de la Fase ${section.phase}`}
                  className="text-muted/60 flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-1.5"
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
                  "flex items-center gap-3 rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "bg-accent/12 text-accent font-medium"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="truncate">{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {courses.length > 0 && (
        <div>
          <p className="text-muted px-3 pb-2 text-xs font-semibold tracking-wide uppercase">Cursos</p>
          <ul className="flex flex-col gap-0.5">
            {courses.map((course) => {
              const active = isActive(pathname, course.href);
              return (
                <li key={course.href}>
                  <Link
                    href={course.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 transition-colors",
                      active
                        ? "bg-surface-2 text-foreground"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{course.title}</span>
                    <span className="text-muted text-xs tabular-nums">{course.lessonCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
