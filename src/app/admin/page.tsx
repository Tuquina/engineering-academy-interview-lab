import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/composition/auth";
import { isPersistenceEnabled } from "@/infrastructure/composition/database";
import { getCatalog } from "@/infrastructure/composition/learning";
import { AdminDashboard } from "@/modules/content-management/presentation/admin-dashboard";

export const metadata: Metadata = { title: "Administración de contenido" };

/**
 * Administración de contenido (MASTER_PROMPT §27). La página verifica el rol en el servidor para no mostrar la
 * interfaz; además, cada endpoint y cada caso de uso vuelven a verificarlo.
 */
export default async function AdminPage() {
  if (!isPersistenceEnabled()) {
    return (
      <AdminMessage text="La administración necesita PostgreSQL (DATABASE_URL). Con docker compose up app se levanta una base local." />
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") return <AdminMessage text="Esta sección requiere una cuenta administradora." />;
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Administración de contenido</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Cursos, módulos, lecciones, preguntas, diagramas y flashcards creados desde la web. Se guardan en
          PostgreSQL como datos estructurados (no MDX ejecutable), con versiones, publicación y auditoría. El
          contenido del repositorio (<code>content/</code>) no se modifica desde acá.
        </p>
      </header>
      <AdminDashboard areas={catalog.areas.map((a) => ({ id: a.id, title: a.title }))} />
    </div>
  );
}

function AdminMessage({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">Administración de contenido</h1>
      <p className="text-muted" data-testid="admin-message">
        {text}
      </p>
    </div>
  );
}
