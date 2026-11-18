import path from "node:path";
import { cache } from "react";
import type { Challenge, ChallengeSummary } from "@/modules/challenges/domain/challenge";
import { loadChallenges } from "@/modules/challenges/infrastructure/file-system-challenge-source";

let productionChallenges: Promise<Challenge[]> | null = null;

/** Challenges del repositorio (cacheados por proceso en producción, releídos en desarrollo). */
export const getChallenges = cache((): Promise<Challenge[]> => {
  const root = path.join(process.cwd(), "content");
  if (process.env.NODE_ENV !== "production") return loadChallenges(root);
  productionChallenges ??= loadChallenges(root).catch((error: unknown) => {
    productionChallenges = null;
    throw error;
  });
  return productionChallenges;
});

/** Versión serializable para listados (sin código ni MDX). */
export function toSummary(challenge: Challenge): ChallengeSummary {
  const {
    id,
    slug,
    title,
    summary,
    kind,
    difficulty,
    durationMinutes,
    technologies,
    topics,
    skills,
    interviewType,
  } = challenge;
  return {
    id,
    slug,
    title,
    summary,
    kind,
    difficulty,
    durationMinutes,
    technologies,
    topics,
    skills,
    interviewType,
  };
}
