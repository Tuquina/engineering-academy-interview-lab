"use client";

import { BookOpen, FlaskConical, Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";

/**
 * Evento que abre el buscador global. La barra inferior lo emite y el buscador (módulo de búsqueda) lo escucha, así
 * el layout compartido no depende del módulo.
 */
export const OPEN_SEARCH_EVENT = "eal:open-search";

const TABS = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/library",
    label: "Biblioteca",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/library") || p.startsWith("/courses") || p.startsWith("/paths"),
  },
  {
    href: "/lab",
    label: "Labs",
    icon: FlaskConical,
    match: (p: string) =>
      ["/lab", "/challenges", "/database-lab", "/agents", "/system-design", "/patterns"].some(
        (prefix) => p === prefix || p.startsWith(`${prefix}/`),
      ),
  },
] as const;

const TAB_CLASS =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors";

/** Barra de accesos rápidos fija abajo en pantallas chicas: lo más usado queda al alcance del pulgar. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Accesos rápidos"
      className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 border-t px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-md gap-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  TAB_CLASS,
                  active ? "text-accent bg-accent/10" : "text-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
            className={cn(TAB_CLASS, "text-muted hover:text-foreground")}
          >
            <Search aria-hidden className="size-5" />
            Buscar
          </button>
        </li>
      </ul>
    </nav>
  );
}
