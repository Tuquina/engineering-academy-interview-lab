import { addDays, lastDays } from "@/shared/kernel/day-key";

/** Segundos mínimos de estudio activo para que un día cuente en la racha. */
export const STREAK_THRESHOLD_SECONDS = 5 * 60;

/** Días con actividad suficiente: unión del tiempo de estudio y de otros registros diarios (p. ej. repasos). */
export type ActivityByDay = Readonly<Record<string, number>>;

/**
 * Racha de estudio: días consecutivos con actividad suficiente que terminan hoy o ayer.
 *
 * Se tolera que hoy todavía no tenga actividad (la racha no se "rompe" hasta que termina el día).
 *
 * @param secondsByDay segundos de estudio por día `YYYY-MM-DD`.
 * @param today día actual del usuario.
 */
export function computeStreak(secondsByDay: ActivityByDay, today: string): number {
  const active = (day: string) => (secondsByDay[day] ?? 0) >= STREAK_THRESHOLD_SECONDS;
  let cursor = active(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Serie diaria (en minutos, redondeada) de los últimos `days` días, lista para graficar. */
export function minutesSeries(
  secondsByDay: ActivityByDay,
  today: string,
  days: number,
): ReadonlyArray<{ day: string; minutes: number }> {
  return lastDays(today, days).map((day) => ({ day, minutes: Math.round((secondsByDay[day] ?? 0) / 60) }));
}

/** Total de minutos en los últimos `days` días (incluido hoy). */
export function totalMinutes(secondsByDay: ActivityByDay, today: string, days: number): number {
  const seconds = lastDays(today, days).reduce((sum, day) => sum + (secondsByDay[day] ?? 0), 0);
  return Math.round(seconds / 60);
}
