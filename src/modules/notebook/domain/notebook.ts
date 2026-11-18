/**
 * Cuaderno personal: notas por lección y marcadores. Funciones puras sobre un estado inmutable.
 * Las notas son texto plano: se renderizan como texto, nunca como HTML o MDX.
 */

export const NOTEBOOK_SCHEMA_VERSION = 1;

/** Límite por nota: suficiente para apuntes extensos y acotado para no agotar el almacenamiento local. */
export const MAX_NOTE_LENGTH = 20_000;

export interface LessonNote {
  readonly text: string;
  readonly updatedAt: string;
}

export interface Bookmark {
  readonly createdAt: string;
}

export interface NotebookState {
  readonly schemaVersion: typeof NOTEBOOK_SCHEMA_VERSION;
  readonly notes: Readonly<Record<string, LessonNote>>;
  readonly bookmarks: Readonly<Record<string, Bookmark>>;
  /** Cheatsheets favoritas, por slug. */
  readonly favoriteCheatsheets: Readonly<Record<string, Bookmark>>;
}

export const EMPTY_NOTEBOOK: NotebookState = Object.freeze({
  schemaVersion: NOTEBOOK_SCHEMA_VERSION,
  notes: Object.freeze({}),
  bookmarks: Object.freeze({}),
  favoriteCheatsheets: Object.freeze({}),
});

/**
 * Guarda la nota de una lección. Un texto vacío (o sólo espacios) elimina la nota; un texto más largo que
 * {@link MAX_NOTE_LENGTH} se recorta. Si el texto no cambió, devuelve el mismo estado.
 */
export function saveNote(state: NotebookState, lessonId: string, text: string, now: Date): NotebookState {
  const value = text.slice(0, MAX_NOTE_LENGTH);
  const current = state.notes[lessonId];
  if (value.trim() === "") {
    if (!current) return state;
    const { [lessonId]: _removed, ...rest } = state.notes;
    return { ...state, notes: rest };
  }
  if (current?.text === value) return state;
  return { ...state, notes: { ...state.notes, [lessonId]: { text: value, updatedAt: now.toISOString() } } };
}

/** Agrega o quita el marcador de una lección. */
export function toggleBookmark(state: NotebookState, lessonId: string, now: Date): NotebookState {
  if (state.bookmarks[lessonId]) {
    const { [lessonId]: _removed, ...rest } = state.bookmarks;
    return { ...state, bookmarks: rest };
  }
  return { ...state, bookmarks: { ...state.bookmarks, [lessonId]: { createdAt: now.toISOString() } } };
}

/** Marcadores del más reciente al más antiguo. */
export function listBookmarks(state: NotebookState): ReadonlyArray<{ lessonId: string } & Bookmark> {
  return Object.entries(state.bookmarks)
    .map(([lessonId, bookmark]) => ({ lessonId, ...bookmark }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Notas de la más recientemente editada a la más antigua. */
export function listNotes(state: NotebookState): ReadonlyArray<{ lessonId: string } & LessonNote> {
  return Object.entries(state.notes)
    .map(([lessonId, note]) => ({ lessonId, ...note }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Agrega o quita una cheatsheet de favoritas. */
export function toggleFavoriteCheatsheet(state: NotebookState, slug: string, now: Date): NotebookState {
  if (state.favoriteCheatsheets[slug]) {
    const { [slug]: _removed, ...rest } = state.favoriteCheatsheets;
    return { ...state, favoriteCheatsheets: rest };
  }
  return {
    ...state,
    favoriteCheatsheets: { ...state.favoriteCheatsheets, [slug]: { createdAt: now.toISOString() } },
  };
}
