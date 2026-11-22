import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { MobileTabBar } from "./mobile-tab-bar";
import { SidebarNav, type CourseNavLink } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * Estructura principal: sidebar persistente en escritorio, barra superior, área de contenido y, en móvil, una barra
 * de accesos rápidos abajo. Es un Server Component; sólo la navegación activa, el menú móvil y el tema se hidratan
 * en el cliente.
 */
export function AppShell({
  courses,
  search,
  account,
  children,
}: {
  courses: readonly CourseNavLink[];
  /** Buscador global; se inyecta como slot para que el layout compartido no dependa de módulos de negocio. */
  search: ReactNode;
  /** Acceso a la cuenta (slot: el layout compartido no depende del módulo de autenticación). */
  account: ReactNode;
  children: ReactNode;
}) {
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
        <header className="border-border bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-6">
          <MobileNav courses={courses} />
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-2">{search}</div>
          <div className="flex items-center gap-1">
            {account}
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Interview Lab — inicio"
      className="text-foreground flex items-center gap-2.5 rounded-md px-2 font-semibold"
    >
      <span className="from-accent to-violet text-accent-foreground flex size-8 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm">
        <GraduationCap className="size-4.5" aria-hidden />
      </span>
      <span className={compact ? "hidden leading-tight sm:block" : "leading-tight"}>
        Interview Lab
        <span className="text-muted block text-[11px] font-normal">Engineering Academy</span>
      </span>
    </Link>
  );
}
