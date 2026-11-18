import { describe, expect, it } from "vitest";
import { normalize, searchEntries, type SearchEntry } from "./search";

const entry = (overrides: Partial<SearchEntry> & Pick<SearchEntry, "id" | "title">): SearchEntry => ({
  kind: "lesson",
  context: "",
  href: `/${overrides.id}`,
  keywords: [],
  ...overrides,
});

const entries: SearchEntry[] = [
  entry({
    id: "erasure",
    title: "Runtime vs sistema de tipos: type erasure",
    keywords: ["zod", "validación"],
  }),
  entry({ id: "event-loop", title: "Event loop de Node.js", keywords: ["microtasks"], context: "Node.js" }),
  entry({
    id: "section",
    kind: "section",
    title: "Tipado estructural",
    context: "Runtime vs sistema de tipos",
  }),
  entry({ id: "redis", kind: "course", title: "Redis", context: "Caching y rate limiting" }),
];

describe("normalize", () => {
  it("quita tildes y pasa a minúsculas", () => {
    expect(normalize("Validación ÁRBOL")).toBe("validacion arbol");
  });
});

describe("searchEntries", () => {
  it("encuentra por prefijo e ignora tildes", () => {
    expect(searchEntries(entries, "valida")[0]?.id).toBe("erasure");
    expect(searchEntries(entries, "VALIDACION")[0]?.id).toBe("erasure");
  });

  it("exige que coincidan todas las palabras", () => {
    expect(searchEntries(entries, "event zod")).toEqual([]);
    expect(searchEntries(entries, "event micro").map((r) => r.id)).toEqual(["event-loop"]);
  });

  it("prioriza coincidencias en el título sobre el contexto", () => {
    const ids = searchEntries(entries, "tipos").map((r) => r.id);
    expect(ids[0]).toBe("erasure");
    expect(ids).toContain("section");
  });

  it("busca dentro del contexto y en nombres con puntos", () => {
    expect(searchEntries(entries, "rate limiting").map((r) => r.id)).toEqual(["redis"]);
    expect(searchEntries(entries, "node.js")[0]?.id).toBe("event-loop");
  });

  it("no devuelve nada para consultas vacías y respeta el límite", () => {
    expect(searchEntries(entries, "   ")).toEqual([]);
    expect(searchEntries(entries, "e", 1)).toHaveLength(1);
  });
});
