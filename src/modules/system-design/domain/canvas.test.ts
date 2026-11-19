import { describe, expect, it } from "vitest";
import { importDesign } from "../application/design-schema";
import {
  CanvasLimitError,
  MAX_NODES,
  addNode,
  connect,
  createDocument,
  describeDesign,
  removeNode,
  toExport,
  updateNode,
} from "./canvas";
import {
  EMPTY_STUDIO,
  MAX_DOCUMENTS,
  StudioLimitError,
  challengeDocumentId,
  freeDocuments,
  resetChallengeWork,
  saveChallengeWork,
  saveDocument,
} from "./studio";

const t = new Date("2026-11-18T10:00:00Z");

function sample() {
  let doc = createDocument("doc-1", "Webhooks", t);
  doc = addNode(doc, "api-gateway", { x: 0, y: 0 }, t);
  doc = addNode(doc, "queue", { x: 200, y: 0 }, t);
  doc = addNode(doc, "worker", { x: 400, y: 0 }, t);
  return doc;
}

describe("Architecture Canvas", () => {
  it("agrega componentes con IDs únicos y etiquetas numeradas por tipo", () => {
    let doc = sample();
    doc = addNode(doc, "worker", { x: 400.6, y: 100.2 }, t);
    expect(doc.nodes.map((n) => n.id)).toEqual(["n-1", "n-2", "n-3", "n-4"]);
    expect(doc.nodes.map((n) => n.label)).toEqual([
      "API Gateway",
      "Cola de mensajes",
      "Workers",
      "Workers 2",
    ]);
    expect(doc.nodes[3]!.position).toEqual({ x: 401, y: 100 });
  });

  it("ignora conexiones a sí mismo, duplicadas o hacia componentes inexistentes", () => {
    let doc = connect(sample(), "n-1", "n-2", "sync", "POST /events", t);
    expect(doc.edges).toHaveLength(1);
    expect(connect(doc, "n-1", "n-2", "async", "", t)).toBe(doc);
    expect(connect(doc, "n-1", "n-1", "sync", "", t)).toBe(doc);
    expect(connect(doc, "n-1", "n-99", "sync", "", t)).toBe(doc);
    doc = connect(doc, "n-2", "n-3", "async", "", t);
    expect(doc.edges.map((e) => e.id)).toEqual(["e-1", "e-2"]);
  });

  it("al eliminar un componente elimina sus conexiones", () => {
    let doc = connect(sample(), "n-1", "n-2", "sync", "", t);
    doc = connect(doc, "n-2", "n-3", "async", "", t);
    doc = removeNode(doc, "n-2", t);
    expect(doc.nodes.map((n) => n.id)).toEqual(["n-1", "n-3"]);
    expect(doc.edges).toEqual([]);
  });

  it("limita la cantidad de componentes", () => {
    let doc = createDocument("big", "Grande", t);
    for (let i = 0; i < MAX_NODES; i++) doc = addNode(doc, "service", { x: i, y: 0 }, t);
    expect(() => addNode(doc, "service", { x: 0, y: 0 }, t)).toThrow(CanvasLimitError);
  });

  it("exporta e importa JSON sin perder datos y descarta conexiones huérfanas", () => {
    let doc = updateNode(
      sample(),
      "n-2",
      { properties: { delivery: "Al menos una vez" }, description: "Eventos" },
      t,
    );
    doc = connect(doc, "n-1", "n-2", "sync", "", t);
    const exported = toExport(doc);
    const imported = importDesign(JSON.stringify(exported), "copy", t);
    expect(imported).toMatchObject({ ok: true, document: { id: "copy", title: "Webhooks" } });
    if (!imported.ok) return;
    expect(imported.document.nodes).toEqual(doc.nodes);
    expect(imported.document.edges).toEqual(doc.edges);

    const orphan = {
      ...exported,
      edges: [...exported.edges, { id: "e-9", source: "n-1", target: "x", kind: "sync", label: "" }],
    };
    const cleaned = importDesign(JSON.stringify(orphan), "c2", t);
    expect(cleaned.ok && cleaned.document.edges).toHaveLength(1);
  });

  it("rechaza archivos que no son JSON o no tienen el formato del canvas", () => {
    expect(importDesign("no es json", "x", t)).toMatchObject({ ok: false });
    expect(importDesign(JSON.stringify({ nodes: [] }), "x", t)).toMatchObject({ ok: false });
  });

  it("describe el diseño en texto con propiedades y tipo de conexión", () => {
    let doc = updateNode(sample(), "n-2", { properties: { delivery: "Al menos una vez" } }, t);
    doc = connect(doc, "n-2", "n-3", "async", "eventos", t);
    const text = describeDesign(doc);
    expect(text).toContain("Cola de mensajes (Cola de mensajes) — Entrega: Al menos una vez");
    expect(text).toContain("Cola de mensajes ⇢ Workers (eventos)");
  });
});

describe("estado del System Design Studio", () => {
  it("lista sólo los diagramas libres, del más reciente al más antiguo", () => {
    let state = saveDocument(EMPTY_STUDIO, {
      ...createDocument("a", "A", t),
      updatedAt: "2026-11-18T09:00:00.000Z",
    });
    state = saveDocument(state, { ...createDocument("b", "B", t), updatedAt: "2026-11-18T11:00:00.000Z" });
    state = saveDocument(state, createDocument(challengeDocumentId("sd.x"), "Challenge", t));
    expect(freeDocuments(state).map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("limita la cantidad de diagramas nuevos pero permite actualizar los existentes", () => {
    let state = EMPTY_STUDIO;
    for (let i = 0; i < MAX_DOCUMENTS; i++) state = saveDocument(state, createDocument(`d${i}`, "D", t));
    expect(() => saveDocument(state, createDocument("extra", "E", t))).toThrow(StudioLimitError);
    expect(() => saveDocument(state, createDocument("d0", "Renombrado", t))).not.toThrow();
  });

  it("combina cambios parciales del trabajo de un challenge y permite reiniciarlo", () => {
    let state = saveChallengeWork(EMPTY_STUDIO, "sd.x", { notes: { requirements: "R" } }, t);
    state = saveChallengeWork(state, "sd.x", { notes: { flows: "F" }, rubric: ["a", "a"] }, t);
    state = saveChallengeWork(state, "sd.x", { checklist: ["c"] }, t);
    expect(state.challengeWork["sd.x"]).toMatchObject({
      notes: { requirements: "R", flows: "F" },
      rubric: ["a"],
      checklist: ["c"],
    });
    state = saveDocument(state, createDocument(challengeDocumentId("sd.x"), "D", t));
    state = resetChallengeWork(state, "sd.x", challengeDocumentId("sd.x"));
    expect(state.challengeWork["sd.x"]).toBeUndefined();
    expect(state.documents[challengeDocumentId("sd.x")]).toBeUndefined();
  });
});
