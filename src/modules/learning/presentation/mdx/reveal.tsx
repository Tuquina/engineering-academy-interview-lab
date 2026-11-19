import { Eye } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Bloque plegable para soluciones de ejercicios: el contenido existe en la página pero queda oculto hasta que el
 * usuario decide verlo (intentar primero, comparar después). Usa `<details>`, accesible sin JavaScript.
 */
export function Reveal({
  title = "Ver una solución posible",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <details className="not-prose border-border bg-surface-2/50 group my-4 rounded-lg border">
      <summary className="text-accent flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-medium">
        <Eye aria-hidden className="size-4" /> {title}
      </summary>
      <div className="prose prose-sm border-border max-w-none border-t px-4 py-3">{children}</div>
    </details>
  );
}
