"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";

interface PublishedCourse {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: "basic" | "intermediate" | "advanced";
  readonly lessonCount: number;
}

const DIFFICULTY = { basic: "Básico", intermediate: "Intermedio", advanced: "Avanzado" } as const;

/**
 * Cursos creados desde la administración. La Biblioteca es estática (contenido del repositorio); esta sección se
 * completa en el navegador para que publicar un curso no requiera volver a compilar la aplicación.
 */
export function CustomCoursesSection() {
  const [courses, setCourses] = useState<readonly PublishedCourse[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/content/courses")
      .then((r) => (r.ok ? (r.json() as Promise<{ courses: PublishedCourse[] }>) : { courses: [] }))
      .then((data) => {
        if (active) setCourses(data.courses);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (courses.length === 0) return null;
  return (
    <section aria-labelledby="contenido-personalizado" data-testid="custom-courses">
      <h2 id="contenido-personalizado" className="text-foreground mb-3 text-xl font-semibold tracking-tight">
        Contenido personalizado
      </h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <li key={course.id}>
            <Link
              href={`/c/${course.slug}`}
              className="border-border bg-surface hover:border-accent/50 flex h-full flex-col gap-2 rounded-lg border p-5"
            >
              <span className="text-foreground font-semibold">{course.title}</span>
              <span className="text-muted flex-1 text-sm">{course.description}</span>
              <span className="flex flex-wrap gap-1.5">
                <Badge tone="violet">Personalizado</Badge>
                <Badge tone="accent">{DIFFICULTY[course.difficulty]}</Badge>
                <Badge>{course.lessonCount} lección(es)</Badge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
