import type { Metadata } from "next";
import Link from "next/link";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";
import { FreeCanvas } from "@/modules/system-design/presentation/free-canvas";

export const metadata: Metadata = { title: "Architecture Canvas" };

export default function CanvasPage() {
  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/system-design" className="hover:text-foreground">
          System Design Studio
        </Link>
      </nav>
      <header className="mb-4">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Architecture Canvas</h1>
        <p className="text-muted mt-1 text-sm">
          Los diagramas se guardan en este navegador. Exportalos como JSON para respaldarlos o importarlos en
          otro equipo, o como imagen para compartirlos.
        </p>
      </header>
      <FreeCanvas />
    </div>
  );
}
