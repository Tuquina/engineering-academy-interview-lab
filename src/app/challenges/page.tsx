import type { Metadata } from "next";
import { getChallenges, toSummary } from "@/infrastructure/composition/challenges";
import { ChallengeCatalog } from "@/modules/challenges/presentation/challenge-catalog";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const challenges = await getChallenges();
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted mt-1">
          Desafíos de entrevista con tests reales (públicos y ocultos), consultas SQL autocorregidas y
          ejercicios de diseño con rúbrica. Cada uno tiene pistas progresivas y una solución de referencia
          explicada.
        </p>
      </header>
      <ChallengeCatalog challenges={challenges.map(toSummary)} />
    </div>
  );
}
