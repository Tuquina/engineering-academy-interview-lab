import { getSearchIndex } from "@/infrastructure/composition/content-extras";

/**
 * Índice del buscador global como JSON estático: se genera en el build y el navegador lo descarga sólo cuando se
 * usa el buscador (antes viajaba serializado en el HTML de cada página, ~340 KB).
 */
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await getSearchIndex());
}
