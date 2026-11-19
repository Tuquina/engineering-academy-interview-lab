import { getAiStatus } from "@/infrastructure/composition/ai";

/** Informa si hay un proveedor LLM real configurado. Nunca devuelve credenciales. */
export function GET() {
  return Response.json(getAiStatus(), { headers: { "cache-control": "no-store" } });
}
