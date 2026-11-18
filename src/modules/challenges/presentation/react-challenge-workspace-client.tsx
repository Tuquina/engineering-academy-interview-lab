"use client";

import dynamic from "next/dynamic";

/**
 * Sandpack crea sus iframes y su cliente en el navegador: se renderiza sólo en el cliente (sin SSR) y se carga
 * bajo demanda, para no sumar su peso al resto de las páginas.
 */
export const ReactChallengeWorkspaceClient = dynamic(
  () => import("./react-challenge-workspace").then((m) => m.ReactChallengeWorkspace),
  { ssr: false, loading: () => <p className="text-muted p-4 text-sm">Cargando el entorno de React…</p> },
);
