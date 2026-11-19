import { codeToHtml } from "shiki";
import { Callout } from "@/modules/learning/presentation/mdx/callout";
import { KnowledgeCheck } from "@/modules/learning/presentation/mdx/knowledge-check";
import { MermaidDiagram } from "@/modules/learning/presentation/mdx/mermaid-diagram";
import { InlineCodeText } from "@/shared/ui/inline-code-text";
import { customQuestionId, type Block } from "../domain/custom-content";

/**
 * Renderiza los bloques de una lección personalizada con componentes controlados (Server Component).
 *
 * El texto se muestra como texto (React escapa todo), el código se resalta con Shiki (que escapa el contenido) y los
 * diagramas usan Mermaid con `securityLevel: "strict"`. No hay HTML ni MDX provisto por el usuario.
 */
export async function CustomLessonBody({ lessonId, blocks }: { lessonId: string; blocks: readonly Block[] }) {
  const rendered = await Promise.all(blocks.map((block) => renderBlock(lessonId, block)));
  return <div className="prose prose-headings:tracking-tight reading-scale max-w-none">{rendered}</div>;
}

async function renderBlock(lessonId: string, block: Block) {
  switch (block.type) {
    case "heading":
      return (
        <h2 key={block.id} id={`seccion-${block.id}`}>
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p key={block.id} className="whitespace-pre-line">
          <InlineCodeText text={block.text} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag key={block.id}>
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineCodeText text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "code": {
      const html = await codeToHtml(block.code, {
        lang: block.language === "text" ? "text" : block.language,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      });
      // Shiki escapa el código: el HTML resultante sólo contiene sus propios elementos de resaltado.
      return (
        <div
          key={block.id}
          className="not-prose my-4 overflow-x-auto rounded-lg text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case "callout":
      return (
        <Callout key={block.id} type={block.tone} title={block.title || undefined}>
          <p>
            <InlineCodeText text={block.text} />
          </p>
        </Callout>
      );
    case "diagram":
      return <MermaidDiagram key={block.id} chart={block.chart} caption={block.caption || undefined} />;
    case "question":
      return (
        <KnowledgeCheck
          key={block.id}
          id={customQuestionId(lessonId, block.id)}
          question={block.question}
          options={block.options.map((o) => ({
            text: o.text,
            correct: o.correct,
            explanation: o.explanation,
          }))}
        />
      );
  }
}
