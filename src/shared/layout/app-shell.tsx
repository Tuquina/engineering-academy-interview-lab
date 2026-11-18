import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { SidebarNav, type CourseNavLink } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * Estructura principal: sidebar persistente en escritorio, barra superior y área de contenido.
 * Es un Server Component; sólo la navegación activa, el menú móvil y el tema se hidratan en el cliente.
 */
export function AppShell({ courses, children }: { courses: readonly CourseNavLink[]; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="bg-accent text-accent-foreground sr-only z-50 rounded px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      <aside className="border-border bg-surface sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r px-3 py-4 lg:flex">
        <Brand />
        <SidebarNav courses={courses} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/85 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur sm:px-6">
          <MobileNav courses={courses} />
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-muted hidden text-xs sm:inline">Modo invitado · progreso local</span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="text-foreground flex items-center gap-2 px-2 font-semibold">
      <span className="bg-accent/15 text-accent flex size-7 items-center justify-center rounded-md">
        <GraduationCap className="size-4" aria-hidden />
      </span>
      <span className="leading-tight">
        Interview Lab
        <span className="text-muted block text-[11px] font-normal">Engineering Academy</span>
      </span>
    </Link>
  );
}
