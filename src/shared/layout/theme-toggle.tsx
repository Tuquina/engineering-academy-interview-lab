"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/shared/ui/button";

export const THEME_STORAGE_KEY = "eal:theme";

/** Clave de preferencias (ver módulo preferences); se lee aquí para aplicar el tamaño de lectura sin destellos. */
const PREFERENCES_KEY = "eal:preferences";

/**
 * Script inline que se ejecuta antes del primer pintado: fija el tema (oscuro por defecto) y el tamaño de lectura
 * guardados en localStorage, evitando el destello de estilos incorrectos.
 */
export const themeInitScript = `(function(){var d=document.documentElement,t="dark",f="md";try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark")t=s;var p=JSON.parse(localStorage.getItem("${PREFERENCES_KEY}")||"null");if(p&&(p.readingFontSize==="sm"||p.readingFontSize==="lg"))f=p.readingFontSize}catch(e){}d.dataset.theme=t;d.dataset.fontSize=f})();`;

export type Theme = "light" | "dark";

/** Aplica y persiste el tema. Sin almacenamiento disponible, el cambio dura sólo la sesión. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Modo privado o almacenamiento bloqueado.
  }
}

const subscribeTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

/** Tema activo, sincronizado con el atributo `data-theme` (lo modifique quien lo modifique). */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}

/** Alterna entre modo claro y oscuro. Los íconos se muestran por CSS según `data-theme`. */
export function ThemeToggle() {
  const toggle = () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");

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
