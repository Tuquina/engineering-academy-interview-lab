/**
 * Utilidades de "día calendario" como string `YYYY-MM-DD`.
 *
 * Las métricas diarias (tiempo de estudio, rachas, repasos) se agrupan por día **local** del usuario. Usar un string
 * en lugar de `Date` evita errores de zona horaria al comparar días y hace el estado serializable.
 */

/** Día local de un instante, como `YYYY-MM-DD`. */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Suma (o resta) días a una clave de día. Opera en UTC para no depender de cambios de horario de verano. */
export function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Lista de `count` días consecutivos que termina en `endDayKey` (inclusive), en orden cronológico. */
export function lastDays(endDayKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(endDayKey, i - count + 1));
}
