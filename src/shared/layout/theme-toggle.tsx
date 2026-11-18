"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/button";

export const THEME_STORAGE_KEY = "eal:theme";

/**
 * Script inline que fija el tema antes del primer pintado (evita el destello de tema incorrecto).
 * Oscuro es el valor por defecto; la preferencia explícita del usuario se guarda en localStorage.
 */
export const themeInitScript = `(function(){var t="dark";try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark")t=s}catch(e){}document.documentElement.dataset.theme=t})();`;

/** Alterna entre modo claro y oscuro. Los íconos se muestran por CSS según `data-theme`. */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento disponible el cambio sólo dura la sesión actual.
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Alternar modo claro u oscuro"
      title="Cambiar tema"
      onClick={toggle}
    >
      <Sun className="theme-icon-dark" aria-hidden />
      <Moon className="theme-icon-light" aria-hidden />
    </Button>
  );
}
