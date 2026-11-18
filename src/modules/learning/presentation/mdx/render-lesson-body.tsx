import rehypeShiki from "@shikijs/rehype";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { Callout } from "./callout";
import { FlowDiagram } from "./flow-diagram";
import { KnowledgeCheck } from "./knowledge-check";

/**
 * Conjunto cerrado de componentes disponibles en las lecciones. Agregar un componente aquí lo habilita para
 * todo el contenido; las lecciones no pueden importar código arbitrario.
 */
export const lessonComponents = {
  Callout,
  FlowDiagram,
  KnowledgeCheck,
};

const SUPPORTED_LANGUAGES = ["ts", "tsx", "js", "json", "csharp", "java", "bash", "sql", "text"] as const;

/**
 * Compila el cuerpo MDX de una lección a React en el servidor.
 *
 * Seguridad: sólo se usa con contenido versionado en el repositorio (confiable). Por eso se permiten expresiones
 * JS en props (`blockJS: false`), manteniendo el bloqueo de globals peligrosos. El contenido creado por usuarios
 * nunca debe pasar por esta función (ver ADR-0003).
 */
export async function renderLessonBody(source: string): Promise<ReactElement> {
  const { content } = await compileMDX({
    source,
    components: lessonComponents,
    options: {
      blockJS: false,
      blockDangerousJS: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeShiki,
            {
              themes: { light: "github-light", dark: "github-dark" },
              defaultColor: false,
              langs: [...SUPPORTED_LANGUAGES],
              fallbackLanguage: "text",
            },
          ],
        ],
      },
    },
  });
  return content;
}
