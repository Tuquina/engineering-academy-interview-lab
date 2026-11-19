/**
 * Defensa contra CSRF para endpoints que modifican datos: además de la cookie `SameSite=Lax`, se exige que el
 * navegador declare el mismo origen. Las herramientas sin navegador (sin cabecera `Origin`) no envían la cookie de
 * sesión de un tercero, así que no representan este riesgo.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === requestHost(request);
  } catch {
    return false;
  }
}

/**
 * Host que usó el navegador. `request.url` no sirve: detrás de Docker (`--hostname 0.0.0.0`) o de un proxy (Vercel)
 * refleja la dirección interna del servidor.
 */
export function requestHost(request: Request): string {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    new URL(request.url).host
  );
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function jsonError(status: number, error: string, headers?: Record<string, string>): Response {
  return jsonResponse({ error }, status, headers);
}

/** Lee y valida un cuerpo JSON con límite de tamaño. */
export async function readJson(
  request: Request,
  maxBytes = 1_000_000,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return { ok: false, response: jsonError(413, "La solicitud es demasiado grande.") };
  const text = await request.text();
  if (text.length > maxBytes)
    return { ok: false, response: jsonError(413, "La solicitud es demasiado grande.") };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError(400, "El cuerpo no es JSON válido.") };
  }
}

/** Origen público (`https://host`) para armar URLs absolutas de redirección y callbacks. */
export function publicOrigin(request: Request): string {
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "");
  return `${proto}://${requestHost(request)}`;
}
