import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface PlaygroundSnippet {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly code: string;
}

/**
 * Lee los ejemplos del playground desde `content/playground/*.ts`. Las dos primeras líneas declaran título y
 * descripción con comentarios `// title:` y `// description:`; el resto es el código.
 *
 * @throws {Error} si un archivo no tiene título o descripción.
 */
export async function loadPlaygroundSnippets(rootDir: string): Promise<PlaygroundSnippet[]> {
  const dir = path.join(rootDir, "playground");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".ts")).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), "utf8");
      const title = /^\/\/ title: (.+)$/m.exec(raw)?.[1]?.trim();
      const description = /^\/\/ description: (.+)$/m.exec(raw)?.[1]?.trim();
      if (!title || !description)
        throw new Error(`content/playground/${file}: faltan "// title:" o "// description:"`);
      const code = raw
        .replace(/^\/\/ title: .+\r?\n/m, "")
        .replace(/^\/\/ description: .+\r?\n/m, "")
        .trimStart();
      return { slug: file.replace(/\.ts$/, ""), title, description, code };
    }),
  );
}
