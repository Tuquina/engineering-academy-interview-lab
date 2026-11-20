import path from "node:path";
import { cache } from "react";
import type {
  ArchitectureChallenge,
  ArchitectureChallengeSummary,
} from "@/modules/system-design/domain/architecture-challenge";
import type { CaseStudy } from "@/modules/system-design/domain/case-study";
import { loadArchitectureChallenges } from "@/modules/system-design/infrastructure/file-system-architecture-challenge-source";
import { loadCaseStudies } from "@/modules/system-design/infrastructure/file-system-case-study-source";

let production: Promise<ArchitectureChallenge[]> | null = null;

/** Challenges de arquitectura (cacheados por proceso en producción, releídos en desarrollo). */
export const getArchitectureChallenges = cache((): Promise<ArchitectureChallenge[]> => {
  const root = path.join(process.cwd(), "content");
  if (process.env.NODE_ENV !== "production") return loadArchitectureChallenges(root);
  production ??= loadArchitectureChallenges(root).catch((error: unknown) => {
    production = null;
    throw error;
  });
  return production;
});

let productionCases: Promise<CaseStudy[]> | null = null;

/** Casos de estudio clásicos de System Design (cacheados por proceso en producción). */
export const getCaseStudies = cache((): Promise<CaseStudy[]> => {
  const root = path.join(process.cwd(), "content");
  if (process.env.NODE_ENV !== "production") return loadCaseStudies(root);
  productionCases ??= loadCaseStudies(root).catch((error: unknown) => {
    productionCases = null;
    throw error;
  });
  return productionCases;
});

export function toArchitectureChallengeSummary(
  challenge: ArchitectureChallenge,
): ArchitectureChallengeSummary {
  const { id, slug, title, summary, difficulty, durationMinutes, topics } = challenge;
  return { id, slug, title, summary, difficulty, durationMinutes, topics };
}
