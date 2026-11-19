import { describe, expect, it } from "vitest";
import { COMPARISON_DIMENSIONS, compareArchitectures, type ArchitectureProfile } from "./comparison";
import { validateDiagram, type ArchitectureDiagram } from "./diagram";
import { filterPatterns, missingPatternSections, type PatternSummary } from "./pattern";

const summary = (overrides: Partial<PatternSummary>): PatternSummary => ({
  id: "pattern.x",
  slug: "x",
  kind: "design",
  category: "behavioral",
  title: "X",
  summary: "",
  difficulty: "basic",
  tags: [],
  ...overrides,
});

describe("biblioteca de patrones", () => {
  const patterns = [
    summary({ slug: "strategy", title: "Strategy", tags: ["polimorfismo"] }),
    summary({ slug: "outbox", title: "Transactional Outbox", kind: "architecture", category: "integration" }),
  ];

  it("filtra por familia, categoría y texto sin distinguir tildes ni mayúsculas", () => {
    expect(filterPatterns(patterns, { kind: "architecture" }).map((p) => p.slug)).toEqual(["outbox"]);
    expect(filterPatterns(patterns, { category: "behavioral" }).map((p) => p.slug)).toEqual(["strategy"]);
    expect(filterPatterns(patterns, { query: "POLIMÓRFISMO" }).map((p) => p.slug)).toEqual(["strategy"]);
    expect(filterPatterns(patterns, {})).toHaveLength(2);
  });

  it("detecta secciones requeridas faltantes o fuera de orden", () => {
    const complete = "## Motivación\n\n## Ejemplo incorrecto\n\n## Implementación correcta\n\n## Ejercicio\n";
    expect(missingPatternSections(complete)).toEqual([]);
    expect(missingPatternSections("## Motivación\n\n## Ejercicio\n")).toEqual([
      "Ejemplo incorrecto",
      "Implementación correcta",
    ]);
    const swapped = "## Motivación\n\n## Implementación correcta\n\n## Ejemplo incorrecto\n\n## Ejercicio\n";
    expect(missingPatternSections(swapped)).toEqual(["Implementación correcta"]);
  });
});

describe("diagramas interactivos", () => {
  const diagram: ArchitectureDiagram = {
    id: "d",
    title: "D",
    description: "",
    kind: "architecture",
    tags: [],
    nodes: [
      { id: "a", label: "A", kind: "service", column: 0, row: 0, responsibility: "", examples: [] },
      { id: "b", label: "B", kind: "database", column: 1, row: 0, responsibility: "", examples: [] },
    ],
    edges: [{ id: "a-b", from: "a", to: "b", kind: "sync" }],
    steps: [{ title: "1", description: "", highlight: ["a", "a-b"] }],
  };

  it("acepta un diagrama consistente", () => {
    expect(validateDiagram(diagram)).toEqual([]);
  });

  it("reporta conexiones, padres y pasos que referencian elementos inexistentes", () => {
    const broken: ArchitectureDiagram = {
      ...diagram,
      nodes: [...diagram.nodes, { ...diagram.nodes[0]!, id: "c", parent: "zzz" }],
      edges: [...diagram.edges, { id: "a-x", from: "a", to: "x", kind: "async" }],
      steps: [{ title: "1", description: "", highlight: ["nope"] }],
    };
    const problems = validateDiagram(broken);
    expect(problems).toHaveLength(3);
    expect(problems.join("\n")).toMatch(/zzz/);
    expect(problems.join("\n")).toMatch(/destino inexistente x/);
    expect(problems.join("\n")).toMatch(/nope/);
  });
});

describe("comparador de arquitecturas", () => {
  const profile = (id: string, level: "low" | "high"): ArchitectureProfile => ({
    id,
    title: id,
    summary: "",
    fitsWhen: [],
    assessments: Object.fromEntries(
      COMPARISON_DIMENSIONS.map((d) => [d, { level: d === "latency" ? level : "medium", explanation: d }]),
    ) as ArchitectureProfile["assessments"],
  });

  it("compara todas las dimensiones y marca dónde hay compromiso", () => {
    const rows = compareArchitectures(profile("a", "low"), profile("b", "high"));
    expect(rows).toHaveLength(COMPARISON_DIMENSIONS.length);
    expect(rows.filter((r) => r.differs).map((r) => r.dimension)).toEqual(["latency"]);
  });
});
