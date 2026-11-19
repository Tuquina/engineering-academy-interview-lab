import type { DesignDocument } from "./canvas";

/**
 * Estado local del System Design Studio: diagramas libres, el diagrama de cada challenge de arquitectura y el
 * trabajo escrito y la autoevaluación de cada challenge.
 */

export const STUDIO_SCHEMA_VERSION = 1;
export const MAX_DOCUMENTS = 40;
export const MAX_NOTES = 20_000;

/** Prefijo de los diagramas que pertenecen a un challenge (no se listan entre los diagramas libres). */
export const CHALLENGE_DOCUMENT_PREFIX = "challenge:";

export interface ChallengeWork {
  /** Notas por sección del espacio de diseño (requerimientos, modelo de datos, flujos…). */
  readonly notes: Readonly<Record<string, string>>;
  readonly checklist: readonly string[];
  readonly rubric: readonly string[];
  readonly updatedAt: string;
}

export interface StudioState {
  readonly schemaVersion: typeof STUDIO_SCHEMA_VERSION;
  readonly documents: Readonly<Record<string, DesignDocument>>;
  readonly challengeWork: Readonly<Record<string, ChallengeWork>>;
}

export const EMPTY_STUDIO: StudioState = {
  schemaVersion: STUDIO_SCHEMA_VERSION,
  documents: {},
  challengeWork: {},
};

export class StudioLimitError extends Error {}

export function challengeDocumentId(challengeId: string): string {
  return `${CHALLENGE_DOCUMENT_PREFIX}${challengeId}`;
}

/** Diagramas libres, del más reciente al más antiguo. */
export function freeDocuments(state: StudioState): DesignDocument[] {
  return Object.values(state.documents)
    .filter((d) => !d.id.startsWith(CHALLENGE_DOCUMENT_PREFIX))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveDocument(state: StudioState, doc: DesignDocument): StudioState {
  const isNew = !(doc.id in state.documents);
  if (isNew && Object.keys(state.documents).length >= MAX_DOCUMENTS) {
    throw new StudioLimitError(`Se alcanzó el máximo de ${MAX_DOCUMENTS} diagramas guardados. Borrá alguno.`);
  }
  return { ...state, documents: { ...state.documents, [doc.id]: doc } };
}

export function deleteDocument(state: StudioState, docId: string): StudioState {
  if (!(docId in state.documents)) return state;
  const { [docId]: _removed, ...documents } = state.documents;
  return { ...state, documents };
}

/** Combina un cambio parcial con el trabajo guardado de un challenge (sin pisar campos no incluidos). */
export function saveChallengeWork(
  state: StudioState,
  challengeId: string,
  patch: {
    notes?: Readonly<Record<string, string>>;
    checklist?: readonly string[];
    rubric?: readonly string[];
  },
  now: Date,
): StudioState {
  const current = state.challengeWork[challengeId];
  const notes = { ...current?.notes, ...patch.notes };
  for (const key of Object.keys(notes)) notes[key] = notes[key]!.slice(0, MAX_NOTES);
  const work: ChallengeWork = {
    notes,
    checklist: [...new Set(patch.checklist ?? current?.checklist ?? [])],
    rubric: [...new Set(patch.rubric ?? current?.rubric ?? [])],
    updatedAt: now.toISOString(),
  };
  return { ...state, challengeWork: { ...state.challengeWork, [challengeId]: work } };
}

/** Borra el trabajo escrito y el diagrama asociados a una clave (para empezar una sesión de entrevista limpia). */
export function resetChallengeWork(state: StudioState, key: string, documentId: string): StudioState {
  const { [key]: _work, ...challengeWork } = state.challengeWork;
  const { [documentId]: _doc, ...documents } = state.documents;
  return { ...state, challengeWork, documents };
}
