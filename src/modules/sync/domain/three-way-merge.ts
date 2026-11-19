/**
 * Merge de tres vías para documentos JSON del cliente (MASTER_PROMPT §29: sincronizar el progreso local con la
 * cuenta evitando duplicados).
 *
 * Con el ancestro común (`base`: lo último que ambos lados tenían sincronizado) se distingue quién cambió qué:
 *
 * - Si sólo cambió un lado, gana ese lado. Así se respetan también los **borrados** (una nota borrada en este
 *   navegador no "resucita" por estar todavía en el servidor).
 * - Objetos: se combinan clave por clave.
 * - Listas de textos: como conjuntos (agregados y quitados de cada lado).
 * - Listas de objetos con `id`: por `id`, sin duplicar registros.
 * - Si ambos lados cambiaron el mismo valor, decide un resolvedor (ver `resolveConflict`).
 *
 * Es idempotente: combinar dos veces lo mismo no cambia el resultado, por eso reintentar una sincronización nunca
 * duplica datos.
 */

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type Resolver = (path: readonly string[], local: Json, remote: Json) => Json;

export function mergeThreeWay(
  base: Json | undefined,
  local: Json,
  remote: Json,
  resolve: Resolver = resolveConflict,
): Json {
  return merge(base, local, remote, [], resolve) as Json;
}

function merge(
  base: Json | undefined,
  local: Json | undefined,
  remote: Json | undefined,
  path: string[],
  resolve: Resolver,
): Json | undefined {
  if (deepEqual(local, remote)) return local;
  if (deepEqual(base, local)) return remote;
  if (deepEqual(base, remote)) return local;
  // Ambos lados cambiaron respecto del ancestro.
  if (local === undefined) return remote; // borrado local vs. modificación remota: se conserva el dato
  if (remote === undefined) return local;
  if (isObject(local) && isObject(remote)) {
    const b = isObject(base) ? base : {};
    const result: { [key: string]: Json } = {};
    const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);
    for (const key of keys) {
      const value = merge(b[key], local[key], remote[key], [...path, key], resolve);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  if (Array.isArray(local) && Array.isArray(remote)) {
    const b = Array.isArray(base) ? base : [];
    if (isStringArray(local) && isStringArray(remote) && isStringArray(b)) return mergeSets(b, local, remote);
    if (isIdArray(local) && isIdArray(remote) && isIdArray(b))
      return mergeById(b, local, remote, path, resolve);
  }
  return resolve(path, local, remote);
}

function mergeSets(base: readonly string[], local: readonly string[], remote: readonly string[]): string[] {
  const removed = new Set([
    ...base.filter((x) => !local.includes(x)),
    ...base.filter((x) => !remote.includes(x)),
  ]);
  const result: string[] = [];
  for (const item of [...remote, ...local]) {
    if (!removed.has(item) && !result.includes(item)) result.push(item);
  }
  return result;
}

type IdRecord = { [key: string]: Json } & { id: string };

function mergeById(
  base: readonly IdRecord[],
  local: readonly IdRecord[],
  remote: readonly IdRecord[],
  path: string[],
  resolve: Resolver,
): Json[] {
  const index = (items: readonly IdRecord[]) => new Map(items.map((item) => [item.id, item]));
  const b = index(base);
  const l = index(local);
  const r = index(remote);
  const order = [...remote.map((x) => x.id), ...local.map((x) => x.id).filter((id) => !r.has(id))];
  const result: Json[] = [];
  for (const id of order) {
    const value = merge(b.get(id), l.get(id), r.get(id), [...path, id], resolve);
    if (value !== undefined) result.push(value);
  }
  return result;
}

/**
 * Resolvedor por defecto para valores que cambiaron en ambos lados, con reglas conservadoras e idempotentes:
 *
 * - `status`: "completed" gana (una lección completada en otro dispositivo sigue completada).
 * - Fechas de inicio (`startedAt`, `createdAt`, `first…`): la más antigua.
 * - Otras fechas (`…At`, `…Day`): la más reciente.
 * - Contadores numéricos: el mayor (no se suman: sumar duplicaría si se reintenta).
 * - Lo demás: el valor de este navegador (la acción más reciente del usuario).
 */
export function resolveConflict(path: readonly string[], local: Json, remote: Json): Json {
  const key = path.at(-1) ?? "";
  if (key === "status" && (local === "completed" || remote === "completed")) return "completed";
  if (
    typeof local === "string" &&
    typeof remote === "string" &&
    looksLikeDate(local) &&
    looksLikeDate(remote)
  ) {
    const earliest = /^(started|created|first)/i.test(key);
    return earliest ? (local < remote ? local : remote) : local > remote ? local : remote;
  }
  if (typeof local === "number" && typeof remote === "number") return Math.max(local, remote);
  return local;
}

function looksLikeDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function isObject(value: unknown): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: readonly unknown[]): value is string[] {
  return value.every((v) => typeof v === "string");
}

function isIdArray(value: readonly unknown[]): value is IdRecord[] {
  return value.every((v) => isObject(v) && typeof v.id === "string");
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((v, i) => deepEqual(v, other[i]));
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
