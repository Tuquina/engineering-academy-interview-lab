import type { Metadata } from "next";
import Link from "next/link";
import { getArchitectureContent } from "@/infrastructure/composition/architecture";
import { ArchitectureComparator } from "@/modules/architecture/presentation/architecture-comparator";

export const metadata: Metadata = { title: "Comparador de arquitecturas" };

export default async function ComparePage() {
  const { profiles } = await getArchitectureContent();
  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/patterns" className="hover:text-foreground">
          Patrones y arquitectura
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Comparador de arquitecturas</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Elegí dos estilos y revisá dónde está cada compromiso: complejidad, escalabilidad, mantenibilidad,
          latencia, consistencia, costos, despliegue, testing, observabilidad y acoplamiento.
        </p>
      </header>
      <ArchitectureComparator profiles={profiles} />
    </div>
  );
}
