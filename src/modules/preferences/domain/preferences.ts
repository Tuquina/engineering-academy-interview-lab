/**
 * Preferencias de estudio del usuario. El tema (claro/oscuro) se guarda aparte porque debe aplicarse antes del
 * primer pintado; el tamaño de lectura también se aplica temprano mediante el mismo script de inicio.
 */

export const PREFERENCES_SCHEMA_VERSION = 1;

export type ReadingFontSize = "sm" | "md" | "lg";

export const READING_FONT_SIZES: readonly ReadingFontSize[] = ["sm", "md", "lg"];

export const READING_FONT_SIZE_LABELS: Readonly<Record<ReadingFontSize, string>> = {
  sm: "Compacto",
  md: "Normal",
  lg: "Grande",
};

/** Rango permitido de tarjetas nuevas por día: evita acumulaciones de repasos inmanejables. */
export const NEW_CARDS_PER_DAY_RANGE = { min: 0, max: 50 } as const;

export interface PreferencesState {
  readonly schemaVersion: typeof PREFERENCES_SCHEMA_VERSION;
  readonly readingFontSize: ReadingFontSize;
  /** Ruta activa; `null` usa la ruta por defecto del catálogo. */
  readonly activePathId: string | null;
  readonly newFlashcardsPerDay: number;
}

export const DEFAULT_PREFERENCES: PreferencesState = Object.freeze({
  schemaVersion: PREFERENCES_SCHEMA_VERSION,
  readingFontSize: "md",
  activePathId: null,
  newFlashcardsPerDay: 10,
});

/** Aplica cambios parciales validando rangos. Devuelve el mismo estado si nada cambia. */
export function updatePreferences(
  state: PreferencesState,
  changes: Partial<Omit<PreferencesState, "schemaVersion">>,
): PreferencesState {
  const next: PreferencesState = {
    ...state,
    ...changes,
    newFlashcardsPerDay: clamp(
      Math.round(changes.newFlashcardsPerDay ?? state.newFlashcardsPerDay),
      NEW_CARDS_PER_DAY_RANGE.min,
      NEW_CARDS_PER_DAY_RANGE.max,
    ),
  };
  const unchanged =
    next.readingFontSize === state.readingFontSize &&
    next.activePathId === state.activePathId &&
    next.newFlashcardsPerDay === state.newFlashcardsPerDay;
  return unchanged ? state : next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
