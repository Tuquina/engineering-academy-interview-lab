"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import type { CourseDocument } from "../application/content-schemas";
import { BLOCK_LABELS, CODE_LANGUAGES, type BlockType } from "../domain/custom-content";

type EditableBlock = CourseDocument["lessons"][number]["blocks"][number];

const field = "border-border bg-surface-2 text-foreground w-full rounded-md border px-2.5 py-1.5 text-sm";

function newBlock(type: BlockType): EditableBlock {
  const id = crypto.randomUUID().slice(0, 8);
  switch (type) {
    case "heading":
      return { id, type, text: "Nueva sección" };
    case "paragraph":
      return { id, type, text: "Texto del párrafo. Usá `backticks` para código en línea." };
    case "list":
      return { id, type, ordered: false, items: ["Primer punto"] };
    case "code":
      return { id, type, language: "ts", code: "const ejemplo = 42;" };
    case "callout":
      return { id, type, tone: "tip", title: "", text: "Un consejo importante." };
    case "diagram":
      return { id, type, chart: "flowchart LR\n  A[Inicio] --> B[Fin]", caption: "" };
    case "question":
      return {
        id,
        type,
        question: "¿Pregunta?",
        options: [
          { text: "Respuesta correcta", correct: true, explanation: "Por qué es correcta." },
          { text: "Respuesta incorrecta", correct: false, explanation: "Por qué no." },
        ],
      };
  }
}

/** Editor de bloques estructurados de una lección: agregar, editar, reordenar y quitar. */
export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: readonly EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
}) {
  const [type, setType] = useState<BlockType>("paragraph");
  const set = (index: number, block: EditableBlock) =>
    onChange(blocks.map((b, i) => (i === index ? block : b)));
  const move = (index: number, delta: number) => {
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div key={block.id} className="border-border rounded-md border p-3" data-testid="block">
          <div className="mb-2 flex items-center gap-1">
            <span className="text-muted flex-1 text-xs font-semibold uppercase">
              {BLOCK_LABELS[block.type]}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Subir bloque"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Bajar bloque"
              disabled={index === blocks.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Quitar bloque"
              onClick={() => onChange(blocks.filter((_, i) => i !== index))}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
          <BlockFields block={block} onChange={(b) => set(index, b)} />
        </div>
      ))}
      <div className="flex gap-2">
        <select
          className={`${field} w-auto`}
          aria-label="Tipo de bloque"
          value={type}
          onChange={(e) => setType(e.target.value as BlockType)}
        >
          {Object.entries(BLOCK_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => onChange([...blocks, newBlock(type)])}>
          <Plus aria-hidden /> Agregar bloque
        </Button>
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: EditableBlock;
  onChange: (block: EditableBlock) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <input
          className={field}
          aria-label="Título de sección"
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case "paragraph":
      return (
        <textarea
          className={`${field} min-h-24`}
          aria-label="Texto del párrafo"
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case "list":
      return (
        <div className="space-y-2">
          <label className="text-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.ordered}
              onChange={(e) => onChange({ ...block, ordered: e.target.checked })}
            />{" "}
            Numerada
          </label>
          <textarea
            className={`${field} min-h-20`}
            aria-label="Elementos de la lista, uno por línea"
            value={block.items.join("\n")}
            onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })}
            onBlur={() => onChange({ ...block, items: block.items.map((i) => i.trim()).filter(Boolean) })}
          />
        </div>
      );
    case "code":
      return (
        <div className="space-y-2">
          <select
            className={`${field} w-auto`}
            aria-label="Lenguaje"
            value={block.language}
            onChange={(e) => onChange({ ...block, language: e.target.value as typeof block.language })}
          >
            {CODE_LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <textarea
            className={`${field} min-h-32 font-mono text-xs`}
            spellCheck={false}
            aria-label="Código"
            value={block.code}
            onChange={(e) => onChange({ ...block, code: e.target.value })}
          />
        </div>
      );
    case "callout":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              className={`${field} w-auto`}
              aria-label="Tipo de aviso"
              value={block.tone}
              onChange={(e) => onChange({ ...block, tone: e.target.value as typeof block.tone })}
            >
              <option value="info">Información</option>
              <option value="tip">Consejo</option>
              <option value="warning">Advertencia</option>
              <option value="danger">Peligro</option>
              <option value="interview">Entrevista</option>
            </select>
            <input
              className={field}
              placeholder="Título (opcional)"
              aria-label="Título del aviso"
              value={block.title}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
          </div>
          <textarea
            className={`${field} min-h-20`}
            aria-label="Texto del aviso"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
        </div>
      );
    case "diagram":
      return (
        <div className="space-y-2">
          <textarea
            className={`${field} min-h-32 font-mono text-xs`}
            spellCheck={false}
            aria-label="Código Mermaid"
            value={block.chart}
            onChange={(e) => onChange({ ...block, chart: e.target.value })}
          />
          <input
            className={field}
            placeholder="Leyenda"
            aria-label="Leyenda del diagrama"
            value={block.caption}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
          />
          <p className="text-muted text-xs">
            Si la sintaxis es inválida, la lección muestra el código del diagrama en lugar de romperse.
          </p>
        </div>
      );
    case "question":
      return (
        <div className="space-y-2">
          <input
            className={field}
            aria-label="Pregunta"
            value={block.question}
            onChange={(e) => onChange({ ...block, question: e.target.value })}
          />
          {block.options.map((option, i) => {
            const update = (patch: Partial<typeof option>) =>
              onChange({
                ...block,
                options: block.options.map((o, j) =>
                  j === i ? { ...o, ...patch } : patch.correct ? { ...o, correct: false } : o,
                ),
              });
            return (
              <div key={i} className="grid gap-1 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
                <label className="text-muted flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name={`correct-${block.id}`}
                    checked={option.correct}
                    onChange={() => update({ correct: true })}
                  />{" "}
                  Correcta
                </label>
                <input
                  className={field}
                  aria-label={`Opción ${i + 1}`}
                  value={option.text}
                  onChange={(e) => update({ text: e.target.value })}
                />
                <input
                  className={field}
                  aria-label={`Explicación de la opción ${i + 1}`}
                  placeholder="Explicación"
                  value={option.explanation}
                  onChange={(e) => update({ explanation: e.target.value })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Quitar opción ${i + 1}`}
                  disabled={block.options.length <= 2}
                  onClick={() => onChange({ ...block, options: block.options.filter((_, j) => j !== i) })}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            );
          })}
          <Button
            size="sm"
            variant="ghost"
            disabled={block.options.length >= 6}
            onClick={() =>
              onChange({
                ...block,
                options: [...block.options, { text: "Otra opción", correct: false, explanation: "" }],
              })
            }
          >
            <Plus aria-hidden /> Opción
          </Button>
        </div>
      );
  }
}
