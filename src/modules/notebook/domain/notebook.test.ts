import { describe, expect, it } from "vitest";
import {
  EMPTY_NOTEBOOK,
  MAX_NOTE_LENGTH,
  listBookmarks,
  listNotes,
  saveNote,
  toggleBookmark,
} from "./notebook";

const t1 = new Date("2026-11-18T10:00:00.000Z");
const t2 = new Date("2026-11-18T11:00:00.000Z");

describe("notas", () => {
  it("guarda, actualiza y elimina notas vacías", () => {
    let state = saveNote(EMPTY_NOTEBOOK, "a", "Idempotencia = mismo efecto", t1);
    expect(state.notes.a).toEqual({ text: "Idempotencia = mismo efecto", updatedAt: t1.toISOString() });
    state = saveNote(state, "a", "   ", t2);
    expect(state.notes.a).toBeUndefined();
    expect(saveNote(EMPTY_NOTEBOOK, "x", "", t1)).toBe(EMPTY_NOTEBOOK);
  });

  it("no cambia el estado si el texto es el mismo y recorta textos demasiado largos", () => {
    const state = saveNote(EMPTY_NOTEBOOK, "a", "hola", t1);
    expect(saveNote(state, "a", "hola", t2)).toBe(state);
    const long = saveNote(EMPTY_NOTEBOOK, "a", "x".repeat(MAX_NOTE_LENGTH + 50), t1);
    expect(long.notes.a?.text.length).toBe(MAX_NOTE_LENGTH);
  });

  it("lista notas por última edición", () => {
    let state = saveNote(EMPTY_NOTEBOOK, "a", "1", t1);
    state = saveNote(state, "b", "2", t2);
    expect(listNotes(state).map((n) => n.lessonId)).toEqual(["b", "a"]);
  });
});

describe("marcadores", () => {
  it("alterna el marcador y lista del más reciente al más antiguo", () => {
    let state = toggleBookmark(EMPTY_NOTEBOOK, "a", t1);
    state = toggleBookmark(state, "b", t2);
    expect(listBookmarks(state).map((b) => b.lessonId)).toEqual(["b", "a"]);
    state = toggleBookmark(state, "a", t2);
    expect(state.bookmarks.a).toBeUndefined();
  });
});

describe("cheatsheets favoritas", () => {
  it("alterna favoritas por slug", async () => {
    const { toggleFavoriteCheatsheet } = await import("./notebook");
    const on = toggleFavoriteCheatsheet(EMPTY_NOTEBOOK, "promises", t1);
    expect(on.favoriteCheatsheets.promises).toEqual({ createdAt: t1.toISOString() });
    expect(toggleFavoriteCheatsheet(on, "promises", t2).favoriteCheatsheets.promises).toBeUndefined();
  });
});
