/**
 * Búsqueda local sobre un índice pequeño (cientos o pocos miles de entradas) sin dependencias externas.
 *
 * Algoritmo, deliberadamente simple y explicable:
 * 1. Se normaliza texto (minúsculas, sin tildes) para que "lección" encuentre "leccion".
 * 2. Cada palabra de la consulta debe aparecer en la entrada (AND): como prefijo de una palabra o como subcadena.
 * 3. Se puntúa por dónde aparece (título > palabras clave > contexto) y por tipo de entrada.
 */

export type SearchEntryKind = "lesson" | "section" | "course" | "path" | "cheatsheet" | "page";

export interface SearchEntry {
  readonly id: string;
  readonly kind: SearchEntryKind;
  readonly title: string;
  /** Texto secundario: curso, lección contenedora o descripción breve. */
  readonly context: string;
  readonly href: string;
  readonly keywords: readonly string[];
}

export interface SearchResult extends SearchEntry {
  readonly score: number;
}

const KIND_BOOST: Readonly<Record<SearchEntryKind, number>> = {
  page: 4,
  lesson: 4,
  course: 3,
  path: 2,
  cheatsheet: 2,
  section: 0,
};

/** Minúsculas y sin diacríticos. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function words(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}#+.]+/u)
    .filter(Boolean);
}

function scoreToken(token: string, title: string[], keywords: string[], context: string[]): number {
  if (title.some((w) => w === token)) return 12;
  if (title.some((w) => w.startsWith(token))) return 10;
  if (keywords.some((w) => w.startsWith(token))) return 6;
  if (title.some((w) => w.includes(token))) return 5;
  if (context.some((w) => w.startsWith(token))) return 3;
  if ([...keywords, ...context].some((w) => w.includes(token))) return 1;
  return 0;
}

/**
 * Busca entradas que contengan todas las palabras de la consulta.
 *
 * @param query texto libre; una consulta vacía no devuelve resultados.
 * @param limit cantidad máxima de resultados.
 * @returns resultados ordenados por relevancia (y, a igual puntaje, por título más corto).
 */
export function searchEntries(entries: readonly SearchEntry[], query: string, limit = 12): SearchResult[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];
  const normalizedQuery = normalize(query.trim());

  const results: SearchResult[] = [];
  for (const entry of entries) {
    const title = words(entry.title);
    const keywords = entry.keywords.flatMap(words);
    const context = words(entry.context);
    let score = 0;
    let matchesAll = true;
    for (const token of tokens) {
      const tokenScore = scoreToken(token, title, keywords, context);
      if (tokenScore === 0) {
        matchesAll = false;
        break;
      }
      score += tokenScore;
    }
    if (!matchesAll) continue;
    if (normalize(entry.title).startsWith(normalizedQuery)) score += 8;
    results.push({ ...entry, score: score + KIND_BOOST[entry.kind] });
  }

  return results.sort((a, b) => b.score - a.score || a.title.length - b.title.length).slice(0, limit);
}
