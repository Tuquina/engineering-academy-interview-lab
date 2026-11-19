import type { Metadata } from "next";
import { MentorPanel } from "@/modules/mentor/presentation/mentor-panel";

export const metadata: Metadata = { title: "AI Study Mentor" };

export default function MentorPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">AI Study Mentor</h1>
        <p className="text-muted mt-1">
          Explicaciones, pistas, preguntas de seguimiento, simulación de entrevistas, comparación de
          alternativas y revisión de código, con un modelo real configurado en el servidor. Enseña antes de
          revelar soluciones. Desde cada lección podés compartirle el contexto de esa lección.
        </p>
      </header>
      <MentorPanel defaultMode="explain" />
    </div>
  );
}
