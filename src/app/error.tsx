"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/button";

/** Límite de error de las páginas: muestra un mensaje útil sin exponer detalles internos. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-foreground text-2xl font-semibold">Algo salió mal</h1>
      <p className="text-muted">
        No pudimos cargar esta sección. Si el problema persiste, revisá los logs del servidor
        {error.digest ? ` (referencia ${error.digest})` : ""}.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
