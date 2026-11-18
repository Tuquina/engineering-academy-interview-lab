import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { ContentSource } from "../application/content-source";
import type { CatalogData, Course, LearningPath, LessonMeta } from "../domain/catalog-types";
import {
  areasFileSchema,
  courseFileSchema,
  lessonFrontmatterSchema,
  pathFileSchema,
} from "./content-schemas";

/** Error de contenido mal formado. Indica el archivo exacto para que el autor pueda corregirlo. */
export class ContentValidationError extends Error {
  constructor(
    readonly filePath: string,
    detail: string,
  ) {
    super(`Contenido inválido en ${filePath}:\n${detail}`);
    this.name = "ContentValidationError";
  }
}

/**
 * Adaptador de {@link ContentSource} que lee el contenido versionado del repositorio.
 *
 * Estructura esperada (relativa a `rootDir`):
 * - `areas.json`
 * - `courses/<carpeta>/course.json` y `courses/<carpeta>/lessons/<slug>.mdx`
 * - `paths/<archivo>.json`
 *
 * El slug de cada lección es el nombre de su archivo. Las rutas a los cuerpos MDX se indexan durante la carga
 * del catálogo; los cuerpos se leen bajo demanda.
 */
export class FileSystemContentSource implements ContentSource {
  private lessonFiles: Map<string, string> | null = null;

  constructor(private readonly rootDir: string) {}

  async loadCatalogData(): Promise<CatalogData> {
    const areas = parseWith(
      areasFileSchema,
      await readJson(this.file("areas.json")),
      this.file("areas.json"),
    );
    const lessonFiles = new Map<string, string>();
    const courses: Course[] = [];
    const lessons: LessonMeta[] = [];

    for (const dir of await listEntries(this.file("courses"), "dir")) {
      const coursePath = this.file("courses", dir, "course.json");
      const course = parseWith(courseFileSchema, await readJson(coursePath), coursePath);
      courses.push(course);

      const lessonsDir = this.file("courses", dir, "lessons");
      for (const fileName of await listEntries(lessonsDir, "file", ".mdx")) {
        const filePath = path.join(lessonsDir, fileName);
        const { data } = matter(await readFile(filePath, "utf8"));
        const frontmatter = parseWith(lessonFrontmatterSchema, data, filePath);
        lessons.push({ ...frontmatter, slug: fileName.replace(/\.mdx$/, ""), courseId: course.id });
        lessonFiles.set(frontmatter.id, filePath);
      }
    }

    const paths: LearningPath[] = [];
    for (const fileName of await listEntries(this.file("paths"), "file", ".json")) {
      const filePath = this.file("paths", fileName);
      paths.push(parseWith(pathFileSchema, await readJson(filePath), filePath));
    }

    this.lessonFiles = lessonFiles;
    return { areas, courses, lessons, paths };
  }

  async loadLessonBody(lessonId: string): Promise<string | null> {
    if (!this.lessonFiles) await this.loadCatalogData();
    const filePath = this.lessonFiles?.get(lessonId);
    if (!filePath) return null;
    return matter(await readFile(filePath, "utf8")).content;
  }

  private file(...segments: string[]): string {
    return path.join(this.rootDir, ...segments);
  }
}

function parseWith<S extends z.ZodType>(schema: S, data: unknown, filePath: string): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ContentValidationError(filePath, z.prettifyError(result.error));
  return result.data;
}

async function readJson(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new ContentValidationError(filePath, `JSON inválido: ${(error as Error).message}`);
  }
}

/** Lista entradas de un directorio ordenadas; devuelve `[]` si el directorio no existe. */
async function listEntries(dir: string, kind: "dir" | "file", extension?: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => (kind === "dir" ? e.isDirectory() : e.isFile()))
      .map((e) => e.name)
      .filter((name) => !extension || name.endsWith(extension))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
