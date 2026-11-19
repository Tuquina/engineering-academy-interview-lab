"use client";

import { ArrowDown, ArrowUp, Eye, Plus, Rocket, Save, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { courseToDocument, type VersionInfo } from "../application/content-admin";
import type { CourseDocument } from "../application/content-schemas";
import {
  customLessonId,
  slugify,
  type ContentStatus,
  type CustomCourse,
  type IntegrityIssue,
} from "../domain/custom-content";
import { AdminApiError, adminFetch } from "./admin-api";
import { BlockEditor } from "./block-editor";

type Lesson = CourseDocument["lessons"][number];

const field = "border-border bg-surface-2 text-foreground w-full rounded-md border px-2.5 py-1.5 text-sm";

interface Loaded {
  readonly document: CourseDocument;
  readonly version: number;
  readonly status: ContentStatus;
  readonly courseId: string;
}

/**
 * Editor de un curso personalizado. Trabaja sobre una copia local del documento y guarda todo junto, con la versión
 * que leyó (si otra pestaña guardó antes, el servidor responde conflicto en lugar de pisar cambios).
 */
export function CourseEditor({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [document, setDocument] = useState<CourseDocument | null>(null);
  const [issues, setIssues] = useState<readonly IntegrityIssue[]>([]);
  const [versions, setVersions] = useState<readonly VersionInfo[]>([]);
  const [selected, setSelected] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const apply = useCallback((course: CustomCourse, nextIssues: readonly IntegrityIssue[]) => {
    const doc = courseToDocument(course);
    setLoaded({ document: doc, version: course.version, status: course.status, courseId: course.id });
    setDocument(doc);
    setIssues(nextIssues);
  }, []);

  const loadVersions = useCallback(async () => {
    const data = await adminFetch<{ versions: VersionInfo[] }>(`/api/admin/courses/${courseId}/versions`);
    setVersions(data.versions);
  }, [courseId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminFetch<{ course: CustomCourse; issues: IntegrityIssue[] }>(`/api/admin/courses/${courseId}`),
      adminFetch<{ versions: VersionInfo[] }>(`/api/admin/courses/${courseId}/versions`),
    ])
      .then(([data, history]) => {
        if (!active) return;
        apply(data.course, data.issues);
        setVersions(history.versions);
      })
      .catch((cause: unknown) => {
        if (active)
          setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
      });
    return () => {
      active = false;
    };
  }, [courseId, apply]);

  if (!document || !loaded) {
    return <p className="text-muted text-sm">{message?.text ?? "Cargando el curso…"}</p>;
  }

  const dirty = JSON.stringify(document) !== JSON.stringify(loaded.document);
  const set = (patch: Partial<CourseDocument>) => setDocument({ ...document, ...patch });
  const lesson = document.lessons[selected];
  const setLesson = (patch: Partial<Lesson>) =>
    set({ lessons: document.lessons.map((l, i) => (i === selected ? { ...l, ...patch } : l)) });

  const run = async (task: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: ok });
      await loadVersions();
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.issues.length) setIssues(cause.issues);
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const data = await adminFetch<{ course: CustomCourse; issues: IntegrityIssue[] }>(
        `/api/admin/courses/${courseId}`,
        {
          method: "PUT",
          body: { expectedVersion: loaded.version, note, course: document },
        },
      );
      apply(data.course, data.issues);
      setNote("");
    }, "Guardado: se creó una versión nueva.");

  const setStatus = (status: ContentStatus) =>
    run(
      async () => {
        const data = await adminFetch<{ course: CustomCourse }>(`/api/admin/courses/${courseId}/status`, {
          method: "POST",
          body: { status, expectedVersion: loaded.version },
        });
        apply(data.course, issues);
      },
      status === "published" ? "Curso publicado." : "Curso despublicado.",
    );

  const restore = (version: number) =>
    run(async () => {
      const data = await adminFetch<{ course: CustomCourse; issues: IntegrityIssue[] }>(
        `/api/admin/courses/${courseId}/versions`,
        {
          method: "POST",
          body: { version, expectedVersion: loaded.version },
        },
      );
      apply(data.course, data.issues);
    }, `Restaurada la versión ${version} como versión nueva.`);

  const remove = () => {
    if (
      !window.confirm(`¿Eliminar el curso "${document.title}" con todas sus versiones? No se puede deshacer.`)
    )
      return;
    void run(async () => {
      await adminFetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
      router.push("/admin");
    }, "Curso eliminado.");
  };

  const addLesson = () => {
    const title = `Lección ${document.lessons.length + 1}`;
    const next: Lesson = {
      id: crypto.randomUUID(),
      moduleId: document.modules[0]?.id ?? "modulo-1",
      slug: slugify(title),
      title,
      description: "",
      difficulty: document.difficulty,
      estimatedMinutes: 15,
      objectives: [],
      tags: [],
      prerequisites: [],
      blocks: [],
      summary: [],
      references: [],
      interviewQuestions: [],
      status: "draft",
    };
    set({ lessons: [...document.lessons, next] });
    setSelected(document.lessons.length);
  };

  const moveLesson = (index: number, delta: number) => {
    const lessons = [...document.lessons];
    const [item] = lessons.splice(index, 1);
    lessons.splice(index + delta, 0, item!);
    set({ lessons });
    setSelected(index + delta);
  };

  return (
    <div className="space-y-4">
      <div className="border-border bg-background/90 sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b py-2 backdrop-blur">
        <Badge tone={loaded.status === "published" ? "success" : "warning"}>
          {loaded.status === "published" ? "Publicado" : "Borrador"}
        </Badge>
        <Badge>v{loaded.version}</Badge>
        {dirty ? <Badge tone="warning">Cambios sin guardar</Badge> : null}
        <input
          className={`${field} max-w-64`}
          placeholder="Nota de la versión (opcional)"
          aria-label="Nota de la versión"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button onClick={() => void save()} disabled={busy || !dirty}>
          <Save aria-hidden /> Guardar
        </Button>
        {loaded.status === "draft" ? (
          <Button variant="secondary" onClick={() => void setStatus("published")} disabled={busy || dirty}>
            <Rocket aria-hidden /> Publicar
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => void setStatus("draft")} disabled={busy || dirty}>
            <Undo2 aria-hidden /> Despublicar
          </Button>
        )}
        <Button variant="ghost" asChild>
          <Link href={`/c/${loaded.document.slug}?preview=1`} target="_blank">
            <Eye aria-hidden /> Vista previa
          </Link>
        </Button>
        <Button variant="ghost" onClick={remove} disabled={busy}>
          <Trash2 aria-hidden /> Eliminar
        </Button>
      </div>
      {message ? (
        <p role="status" className={message.tone === "ok" ? "text-success text-sm" : "text-danger text-sm"}>
          {message.text}
        </p>
      ) : null}
      {issues.length ? (
        <ul
          className="border-warning/40 bg-warning/10 rounded-md border p-3 text-sm"
          aria-label="Problemas de integridad"
        >
          {issues.map((issue, i) => (
            <li key={i} className={issue.severity === "error" ? "text-danger" : "text-foreground"}>
              {issue.severity === "error" ? "Error" : "Aviso"}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Curso</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Label text="Título">
              <input
                className={field}
                value={document.title}
                maxLength={160}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Label>
            <Label text="Slug (URL /c/…)">
              <input
                className={field}
                value={document.slug}
                maxLength={80}
                onChange={(e) => set({ slug: e.target.value })}
              />
            </Label>
            <Label text="Dificultad">
              <select
                className={field}
                value={document.difficulty}
                onChange={(e) => set({ difficulty: e.target.value as CourseDocument["difficulty"] })}
              >
                <option value="basic">Básico</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </Label>
            <Label text="Prerrequisitos (IDs de cursos o lecciones, uno por línea)">
              <LinesInput
                key={loaded.version}
                lines={document.prerequisites}
                onChange={(prerequisites) => set({ prerequisites })}
              />
            </Label>
          </div>
          <Label text="Descripción" className="mt-3">
            <textarea
              className={`${field} min-h-16`}
              value={document.description}
              maxLength={1000}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Label>
          <h3 className="text-foreground mt-4 mb-2 text-sm font-semibold">Módulos</h3>
          <ul className="space-y-2">
            {document.modules.map((section, i) => (
              <li key={section.id} className="flex items-center gap-2">
                <code className="text-muted w-28 shrink-0 truncate text-xs">{section.id}</code>
                <input
                  className={field}
                  aria-label={`Título del módulo ${i + 1}`}
                  value={section.title}
                  onChange={(e) =>
                    set({
                      modules: document.modules.map((m, j) =>
                        j === i ? { ...m, title: e.target.value } : m,
                      ),
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Quitar módulo ${section.title}`}
                  disabled={
                    document.modules.length <= 1 || document.lessons.some((l) => l.moduleId === section.id)
                  }
                  onClick={() => set({ modules: document.modules.filter((_, j) => j !== i) })}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              set({
                modules: [
                  ...document.modules,
                  {
                    id: `modulo-${document.modules.length + 1}-${crypto.randomUUID().slice(0, 4)}`,
                    title: `Módulo ${document.modules.length + 1}`,
                  },
                ],
              })
            }
          >
            <Plus aria-hidden /> Módulo
          </Button>
        </Card>

        <Card>
          <CardTitle>Lecciones</CardTitle>
          <CardDescription>
            El ID estable de cada lección (para progreso y prerrequisitos) no cambia aunque cambie el slug.
          </CardDescription>
          <ol className="mt-3 space-y-1">
            {document.lessons.map((l, i) => (
              <li
                key={l.id}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1",
                  i === selected && "bg-surface-2",
                )}
              >
                <button
                  type="button"
                  className="text-foreground min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => setSelected(i)}
                >
                  {i + 1}. {l.title}
                </button>
                <Badge tone={l.status === "published" ? "success" : "warning"}>
                  {l.status === "published" ? "Publicada" : "Borrador"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Subir lección"
                  disabled={i === 0}
                  onClick={() => moveLesson(i, -1)}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Bajar lección"
                  disabled={i === document.lessons.length - 1}
                  onClick={() => moveLesson(i, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
          <Button size="sm" variant="secondary" className="mt-2" onClick={addLesson}>
            <Plus aria-hidden /> Lección
          </Button>
          <h3 className="text-foreground mt-5 mb-2 text-sm font-semibold">Flashcards</h3>
          <ul className="space-y-2">
            {document.flashcards.map((card, i) => (
              <li key={card.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  className={field}
                  aria-label={`Frente de la tarjeta ${i + 1}`}
                  value={card.front}
                  onChange={(e) =>
                    set({
                      flashcards: document.flashcards.map((c, j) =>
                        j === i ? { ...c, front: e.target.value } : c,
                      ),
                    })
                  }
                />
                <input
                  className={field}
                  aria-label={`Dorso de la tarjeta ${i + 1}`}
                  value={card.back}
                  onChange={(e) =>
                    set({
                      flashcards: document.flashcards.map((c, j) =>
                        j === i ? { ...c, back: e.target.value } : c,
                      ),
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Quitar tarjeta ${i + 1}`}
                  onClick={() => set({ flashcards: document.flashcards.filter((_, j) => j !== i) })}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              set({
                flashcards: [
                  ...document.flashcards,
                  { id: crypto.randomUUID(), front: "Pregunta", back: "Respuesta" },
                ],
              })
            }
          >
            <Plus aria-hidden /> Tarjeta
          </Button>
        </Card>
      </div>

      {lesson ? (
        <Card data-testid="lesson-editor">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex-1">Lección: {lesson.title}</CardTitle>
            <code className="text-muted text-xs">{customLessonId(lesson.id)}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                set({ lessons: document.lessons.filter((_, i) => i !== selected) });
                setSelected(Math.max(0, selected - 1));
              }}
            >
              <Trash2 aria-hidden /> Quitar lección
            </Button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Label text="Título">
              <input
                className={field}
                value={lesson.title}
                maxLength={160}
                onChange={(e) => setLesson({ title: e.target.value })}
              />
            </Label>
            <Label text="Slug">
              <input
                className={field}
                value={lesson.slug}
                maxLength={80}
                onChange={(e) => setLesson({ slug: e.target.value })}
              />
            </Label>
            <Label text="Estado">
              <select
                className={field}
                value={lesson.status}
                onChange={(e) => setLesson({ status: e.target.value as ContentStatus })}
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
              </select>
            </Label>
            <Label text="Módulo">
              <select
                className={field}
                value={lesson.moduleId}
                onChange={(e) => setLesson({ moduleId: e.target.value })}
              >
                {document.modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Dificultad">
              <select
                className={field}
                value={lesson.difficulty}
                onChange={(e) => setLesson({ difficulty: e.target.value as Lesson["difficulty"] })}
              >
                <option value="basic">Básico</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </Label>
            <Label text="Minutos estimados">
              <input
                className={field}
                type="number"
                min={1}
                max={600}
                value={lesson.estimatedMinutes}
                onChange={(e) =>
                  setLesson({ estimatedMinutes: Math.min(600, Math.max(1, Number(e.target.value) || 1)) })
                }
              />
            </Label>
          </div>
          <Label text="Descripción" className="mt-3">
            <textarea
              className={`${field} min-h-14`}
              value={lesson.description}
              maxLength={600}
              onChange={(e) => setLesson({ description: e.target.value })}
            />
          </Label>
          <div key={`${lesson.id}-${loaded.version}`} className="mt-3 grid gap-3 md:grid-cols-2">
            <Label text="Objetivos (uno por línea)">
              <LinesInput lines={lesson.objectives} onChange={(objectives) => setLesson({ objectives })} />
            </Label>
            <Label text="Resumen y puntos clave (uno por línea)">
              <LinesInput lines={lesson.summary} onChange={(summary) => setLesson({ summary })} />
            </Label>
            <Label text="Prerrequisitos (IDs de lecciones, uno por línea)">
              <LinesInput
                lines={lesson.prerequisites}
                onChange={(prerequisites) => setLesson({ prerequisites })}
              />
            </Label>
            <Label text="Etiquetas (una por línea)">
              <LinesInput lines={lesson.tags} onChange={(tags) => setLesson({ tags })} />
            </Label>
            <Label text="Referencias (título | https://url, una por línea)">
              <LinesInput
                lines={lesson.references.map((r) => `${r.title} | ${r.url}`)}
                onChange={(lines) =>
                  setLesson({
                    references: lines.map((line) => {
                      const [title = "", url = ""] = line.split("|").map((p) => p.trim());
                      return { title, url };
                    }),
                  })
                }
              />
            </Label>
            <Label text="Preguntas de entrevista (pregunta :: punto; punto, una por línea)">
              <LinesInput
                lines={lesson.interviewQuestions.map((q) => `${q.question} :: ${q.keyPoints.join("; ")}`)}
                onChange={(lines) =>
                  setLesson({
                    interviewQuestions: lines.map((line) => {
                      const [question = "", points = ""] = line.split("::").map((p) => p.trim());
                      return {
                        question,
                        keyPoints: points
                          .split(";")
                          .map((p) => p.trim())
                          .filter(Boolean),
                      };
                    }),
                  })
                }
              />
            </Label>
          </div>
          <h3 className="text-foreground mt-5 mb-2 text-sm font-semibold">Contenido</h3>
          <BlockEditor blocks={lesson.blocks} onChange={(blocks) => setLesson({ blocks })} />
        </Card>
      ) : null}

      <Card>
        <CardTitle>Versiones</CardTitle>
        <CardDescription>
          Cada guardado crea una versión. Restaurar crea una versión nueva con el contenido anterior.
        </CardDescription>
        <ol className="mt-2 space-y-1 text-sm">
          {versions.map((v) => (
            <li key={v.version} className="flex flex-wrap items-center gap-2">
              <Badge>v{v.version}</Badge>
              <span className="text-muted text-xs">{new Date(v.createdAt).toLocaleString("es-AR")}</span>
              <span className="text-foreground min-w-0 flex-1 truncate">{v.note || "Sin nota"}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || dirty}
                onClick={() => void restore(v.version)}
              >
                Restaurar
              </Button>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Label({
  text,
  children,
  className,
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0 text-sm", className)}>
      <span className="text-muted mb-1 block text-xs font-medium">{text}</span>
      {children}
    </label>
  );
}

/** Texto con un elemento por línea; se confirma al salir del campo para poder escribir líneas nuevas. */
function LinesInput({ lines, onChange }: { lines: readonly string[]; onChange: (lines: string[]) => void }) {
  const [text, setText] = useState(lines.join("\n"));
  return (
    <textarea
      className={`${field} min-h-20`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        onChange(
          text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        )
      }
    />
  );
}
