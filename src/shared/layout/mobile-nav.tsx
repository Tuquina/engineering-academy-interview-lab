"use client";

import { Menu, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/shared/ui/button";
import { SidebarNav, type CourseNavLink } from "./sidebar-nav";

/**
 * Navegación para pantallas pequeñas. Usa `<dialog>` nativo: aporta foco atrapado, cierre con Escape y
 * fondo inerte sin dependencias adicionales.
 */
export function MobileNav({ courses }: { courses: readonly CourseNavLink[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir navegación"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Menu />
      </Button>
      <dialog
        ref={dialogRef}
        aria-label="Navegación"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="border-border bg-surface text-foreground m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r p-0 backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Interview Lab</span>
            <Button variant="ghost" size="icon" aria-label="Cerrar navegación" onClick={close}>
              <X />
            </Button>
          </div>
          <SidebarNav courses={courses} onNavigate={close} />
        </div>
      </dialog>
    </>
  );
}
