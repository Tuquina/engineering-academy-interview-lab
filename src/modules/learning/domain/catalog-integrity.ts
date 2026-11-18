import type { CatalogData } from "./catalog-types";

export type IntegrityIssueCode =
  | "duplicate-id"
  | "duplicate-slug"
  | "unknown-area"
  | "unknown-course"
  | "unknown-module"
  | "unknown-lesson"
  | "prerequisite-cycle"
  | "self-prerequisite";

/** Problema de integridad detectado en el catálogo. */
export interface IntegrityIssue {
  readonly code: IntegrityIssueCode;
  readonly entityId: string;
  readonly message: string;
}

/**
 * Verifica la consistencia referencial del catálogo completo.
 *
 * Reglas:
 * - IDs únicos por tipo de entidad (áreas, cursos, lecciones, rutas) y slugs únicos en su ámbito
 *   (cursos y rutas a nivel global, lecciones dentro de su curso, módulos dentro de su curso).
 * - Toda referencia (área de un curso, módulo de una lección, prerrequisitos, elementos de rutas) debe existir.
 * - Los grafos de prerrequisitos de cursos y de lecciones deben ser acíclicos.
 *
 * @param data datos crudos del catálogo.
 * @returns lista de problemas; vacía si el catálogo es consistente. Nunca lanza.
 */
export function validateCatalogIntegrity(data: CatalogData): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  checkUnique(
    issues,
    "duplicate-id",
    "área",
    data.areas.map((a) => a.id),
  );
  checkUnique(
    issues,
    "duplicate-slug",
    "área (slug)",
    data.areas.map((a) => a.slug),
  );
  checkUnique(
    issues,
    "duplicate-id",
    "curso",
    data.courses.map((c) => c.id),
  );
  checkUnique(
    issues,
    "duplicate-slug",
    "curso (slug)",
    data.courses.map((c) => c.slug),
  );
  checkUnique(
    issues,
    "duplicate-id",
    "lección",
    data.lessons.map((l) => l.id),
  );
  checkUnique(
    issues,
    "duplicate-id",
    "ruta",
    data.paths.map((p) => p.id),
  );
  checkUnique(
    issues,
    "duplicate-slug",
    "ruta (slug)",
    data.paths.map((p) => p.slug),
  );

  const areaIds = new Set(data.areas.map((a) => a.id));
  const courseById = new Map(data.courses.map((c) => [c.id, c]));
  const lessonIds = new Set(data.lessons.map((l) => l.id));

  for (const course of data.courses) {
    if (!areaIds.has(course.areaId)) {
      issues.push({
        code: "unknown-area",
        entityId: course.id,
        message: `El curso "${course.id}" referencia el área inexistente "${course.areaId}".`,
      });
    }
    checkUnique(
      issues,
      "duplicate-id",
      `módulo de ${course.id}`,
      course.modules.map((m) => m.id),
    );
    checkUnique(
      issues,
      "duplicate-slug",
      `módulo de ${course.id} (slug)`,
      course.modules.map((m) => m.slug),
    );
    for (const prerequisite of course.prerequisites) {
      checkReference(
        issues,
        courseById.has(prerequisite),
        "unknown-course",
        course.id,
        prerequisite,
        "curso",
      );
    }
  }

  for (const course of data.courses) {
    const slugs = data.lessons.filter((l) => l.courseId === course.id).map((l) => l.slug);
    checkUnique(issues, "duplicate-slug", `lección de ${course.id} (slug)`, slugs);
  }

  for (const lesson of data.lessons) {
    const course = courseById.get(lesson.courseId);
    if (!course) {
      checkReference(issues, false, "unknown-course", lesson.id, lesson.courseId, "curso");
    } else if (!course.modules.some((m) => m.id === lesson.moduleId)) {
      issues.push({
        code: "unknown-module",
        entityId: lesson.id,
        message: `La lección "${lesson.id}" referencia el módulo "${lesson.moduleId}", que no existe en "${course.id}".`,
      });
    }
    for (const prerequisite of lesson.prerequisites) {
      checkReference(
        issues,
        lessonIds.has(prerequisite),
        "unknown-lesson",
        lesson.id,
        prerequisite,
        "lección",
      );
    }
  }

  for (const path of data.paths) {
    for (const stage of path.stages) {
      for (const item of stage.items) {
        if (item.kind === "lesson") {
          checkReference(
            issues,
            lessonIds.has(item.lessonId),
            "unknown-lesson",
            path.id,
            item.lessonId,
            "lección",
          );
        } else {
          checkReference(
            issues,
            courseById.has(item.courseId),
            "unknown-course",
            path.id,
            item.courseId,
            "curso",
          );
        }
      }
    }
  }

  issues.push(...findCycles(data.courses.map((c) => ({ id: c.id, deps: c.prerequisites }))));
  issues.push(...findCycles(data.lessons.map((l) => ({ id: l.id, deps: l.prerequisites }))));

  return issues;
}

function checkUnique(
  issues: IntegrityIssue[],
  code: IntegrityIssueCode,
  label: string,
  values: readonly string[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      issues.push({ code, entityId: value, message: `Valor duplicado para ${label}: "${value}".` });
    }
    seen.add(value);
  }
}

function checkReference(
  issues: IntegrityIssue[],
  exists: boolean,
  code: IntegrityIssueCode,
  ownerId: string,
  targetId: string,
  targetLabel: string,
): void {
  if (!exists) {
    issues.push({
      code,
      entityId: ownerId,
      message: `"${ownerId}" referencia ${targetLabel} inexistente "${targetId}".`,
    });
  }
}

interface DependencyNode {
  readonly id: string;
  readonly deps: readonly string[];
}

/** Detecta ciclos en un grafo de dependencias mediante DFS con coloreado (blanco/gris/negro). */
function findCycles(nodes: readonly DependencyNode[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const depsById = new Map(nodes.map((n) => [n.id, n.deps]));
  const state = new Map<string, "visiting" | "done">();

  const visit = (id: string, trail: string[]): void => {
    const current = state.get(id);
    if (current === "done") return;
    if (current === "visiting") {
      const cycle = [...trail.slice(trail.indexOf(id)), id];
      issues.push({
        code: cycle.length === 2 ? "self-prerequisite" : "prerequisite-cycle",
        entityId: id,
        message: `Ciclo de prerrequisitos: ${cycle.join(" → ")}.`,
      });
      return;
    }
    state.set(id, "visiting");
    for (const dep of depsById.get(id) ?? []) {
      if (depsById.has(dep)) visit(dep, [...trail, id]);
    }
    state.set(id, "done");
  };

  for (const node of nodes) visit(node.id, []);
  return issues;
}
