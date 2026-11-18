import { Fragment } from "react";

/**
 * Renderiza texto plano en el que los fragmentos entre backticks se muestran como código.
 * Se usa en props de componentes MDX, donde el contenido llega como string y no como Markdown.
 */
export function InlineCodeText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
          <code
            key={index}
            className="bg-surface-2 rounded px-1 font-mono text-[0.9em] [overflow-wrap:anywhere]"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
