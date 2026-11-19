import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/composition/auth";
import { isPersistenceEnabled } from "@/infrastructure/composition/database";
import { CourseEditor } from "@/modules/content-management/presentation/course-editor";

export const metadata: Metadata = { title: "Editar curso" };

export default async function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  if (!isPersistenceEnabled()) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/admin");
  const { id } = await params;
  return (
    <div className="mx-auto max-w-[96rem]">
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/admin" className="hover:text-foreground">
          Administración de contenido
        </Link>
      </nav>
      <CourseEditor courseId={id} />
    </div>
  );
}
