import path from "node:path";
import { cache } from "react";
import type { PatternSummary } from "@/modules/architecture/domain/pattern";
import {
  loadArchitectureContent,
  type ArchitectureContent,
} from "@/modules/architecture/infrastructure/file-system-architecture-source";

let production: Promise<ArchitectureContent> | null = null;

/** Patrones, diagramas y perfiles del comparador (cacheados por proceso en producción, releídos en desarrollo). */
export const getArchitectureContent = cache((): Promise<ArchitectureContent> => {
  const root = path.join(process.cwd(), "content");
  if (process.env.NODE_ENV !== "production") return loadArchitectureContent(root);
  production ??= loadArchitectureContent(root).catch((error: unknown) => {
    production = null;
    throw error;
  });
  return production;
});

export function toPatternSummary(pattern: PatternSummary): PatternSummary {
  const { id, slug, kind, category, title, summary, difficulty, tags } = pattern;
  return { id, slug, kind, category, title, summary, difficulty, tags };
}
