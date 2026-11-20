import { createHash, timingSafeEqual } from "node:crypto";
import { count } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/composition/database";
import { jsonError, jsonResponse } from "@/infrastructure/http/same-origin";
import { users } from "@/modules/auth/infrastructure/auth-tables";

export const dynamic = "force-dynamic";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Compara el header `Authorization` con `Bearer <CRON_SECRET>` en tiempo constante. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/**
 * Vercel Cron llama a esta ruta una vez por día (`vercel.json`). Hace una consulta real a la base para que el plan
 * gratuito de Supabase no pause el proyecto por inactividad. Sólo responde a Vercel: exige `CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return jsonError(401, "No autorizado.");
  const db = getDatabase();
  if (!db) return jsonError(503, "La base de datos no está configurada.");
  const [row] = await db.select({ users: count() }).from(users);
  return jsonResponse({ ok: true, users: row?.users ?? 0, at: new Date().toISOString() });
}
