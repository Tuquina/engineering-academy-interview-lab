import { AuthError } from "@/modules/auth/application/auth-service";
import { jsonError } from "./same-origin";

const STATUS: Record<AuthError["code"], number> = {
  invalid_input: 400,
  invalid_credentials: 401,
  signup_closed: 403,
  already_exists: 409,
};

/** Traduce errores del caso de uso a respuestas HTTP; cualquier otro error es un 500 sin detalles internos. */
export function authErrorResponse(cause: unknown): Response {
  if (cause instanceof AuthError) return jsonError(STATUS[cause.code], cause.message);
  console.error("Error de autenticación", cause);
  return jsonError(500, "No se pudo completar la operación.");
}

export const PERSISTENCE_DISABLED =
  "La persistencia no está configurada (DATABASE_URL): la plataforma funciona en modo invitado.";
