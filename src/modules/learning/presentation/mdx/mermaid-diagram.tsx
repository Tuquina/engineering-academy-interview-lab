"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@/shared/layout/theme-toggle";
import { Button } from "@/shared/ui/button";

/**
 * Diagrama declarativo con Mermaid, renderizado en el cliente.
 *
 * - Mermaid se carga con `import()` dinámico sólo en páginas que lo usan (no pesa en el bundle inicial).
 * - Se re-renderiza al cambiar el tema para mantener el contraste.
 * - `securityLevel: "strict"` deshabilita HTML y clics en etiquetas: el código del diagrama es contenido.
 * - Mientras carga, y si falla, se muestra el código fuente: el contenido nunca queda oculto.
 */
export function MermaidDiagram({ chart, caption }: { chart: string; caption?: string }) {
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const theme = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // El SVG ampliado se monta sólo con el diálogo abierto: evita IDs duplicados de Mermaid en el documento.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "default",
          fontFamily: "var(--font-sans)",
        });
        const { svg: rendered } = await mermaid.render(`mermaid-${baseId}-${theme}`, chart.trim());
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, theme, baseId]);

  return (
    <figure className="not-prose border-border bg-surface my-8 rounded-lg border p-4">
      <div className="mb-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          disabled={!svg}
          onClick={() => {
            setExpanded(true);
            dialogRef.current?.showModal();
          }}
          aria-label="Ver diagrama en pantalla completa"
        >
          <Maximize2 /> Ampliar
        </Button>
      </div>
      {svg ? (
        // El SVG proviene de Mermaid con securityLevel "strict" a partir de contenido versionado del repositorio.
        <div
          className="flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <pre className="text-muted overflow-x-auto text-xs" aria-busy={!error}>
          {error ? `No se pudo renderizar el diagrama (${error}).\n\n` : ""}
          {chart.trim()}
        </pre>
      )}
      {caption && <figcaption className="text-muted mt-3 text-center text-xs">{caption}</figcaption>}

      <dialog
        ref={dialogRef}
        aria-label={caption ?? "Diagrama"}
        onClose={() => setExpanded(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="bg-surface text-foreground m-auto h-[90dvh] w-[95vw] max-w-none rounded-xl p-0 backdrop:bg-black/60"
      >
        <div className="flex h-full flex-col">
          <div className="border-border flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-medium">{caption ?? "Diagrama"}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar"
              onClick={() => dialogRef.current?.close()}
            >
              <X />
            </Button>
          </div>
          {expanded && svg && (
            <div
              className="flex flex-1 items-center justify-center overflow-auto p-6 [&_svg]:h-full [&_svg]:w-full [&_svg]:max-w-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      </dialog>
    </figure>
  );
}
