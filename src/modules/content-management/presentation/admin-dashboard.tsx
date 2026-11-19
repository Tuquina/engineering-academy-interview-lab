"use client";

import { Download, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import type { AuditEntry } from "../application/content-admin";
import type { CourseSummary } from "../domain/custom-content";
import { AdminApiError, adminFetch, downloadJson } from "./admin-api";

const input = "border-border bg-surface-2 text-foreground h-9 rounded-md border px-3 text-sm";

/** Tablero de administración: cursos personalizados, creación, importación/exportación y auditoría. */
export function AdminDashboard({ areas }: { areas: readonly { id: string; title: string }[] }) {
  const router = useRouter();
  const [courses, setCourses] = useState<readonly CourseSummary[] | null>(null);
  const [audit, setAudit] = useState<readonly AuditEntry[]>([]);
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [mode, setMode] = useState<"skip" | "replace">("skip");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [list, log] = await Promise.all([
        adminFetch<{ courses: CourseSummary[] }>("/api/admin/courses"),
        adminFetch<{ entries: AuditEntry[] }>("/api/admin/audit"),
      ]);
      setCourses(list.courses);
      setAudit(log.entries);
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminFetch<{ courses: CourseSummary[] }>("/api/admin/courses"),
      adminFetch<{ entries: AuditEntry[] }>("/api/admin/audit"),
    ])
      .then(([list, log]) => {
        if (!active) return;
        setCourses(list.courses);
        setAudit(log.entries);
      })
      .catch((cause: unknown) => {
        if (active)
          setMessage({ tone: "error", text: cause instanceof Error ? cause.message : String(cause) });
      });
    return () => {
      active = false;
    };
  }, []);

  const report = (cause: unknown) =>
    setMessage({
      tone: "error",
      text: cause instanceof AdminApiError || cause instanceof Error ? cause.message : String(cause),
    });

  const create = async () => {
    try {
      const { course } = await adminFetch<{ course: { id: string } }>("/api/admin/courses", {
        method: "POST",
        body: { title, areaId },
      });
      router.push(`/admin/courses/${course.id}`);
    } catch (cause) {
      report(cause);
    }
  };

  const exportAll = async () => {
    try {
      const file = await adminFetch<{ exportedAt: string }>("/api/admin/content");
      downloadJson(`interview-lab-contenido-${file.exportedAt.slice(0, 10)}.json`, file);
    } catch (cause) {
      report(cause);
    }
  };

  const importFile = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = await adminFetch<{
        created: string[];
        updated: string[];
        skipped: string[];
        issues: { message: string }[];
      }>("/api/admin/content", { method: "POST", body: { mode, file: parsed } });
      setMessage({
        tone: result.issues.length ? "error" : "ok",
        text:
          `Creados: ${result.created.join(", ") || "ninguno"}. Actualizados: ${result.updated.join(", ") || "ninguno"}. ` +
          `Omitidos: ${result.skipped.join(", ") || "ninguno"}.` +
          (result.issues.length ? ` Problemas: ${result.issues.map((i) => i.message).join(" ")}` : ""),
      });
      await load();
    } catch (cause) {
      report(cause);
    }
  };

  return (
    <div className="space-y-4">
      {message ? (
        <p role="status" className={message.tone === "ok" ? "text-success text-sm" : "text-danger text-sm"}>
          {message.text}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Nuevo curso</CardTitle>
          <CardDescription>
            Aparece en la Biblioteca al publicarlo, con las mismas pantallas que el resto.
          </CardDescription>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <input
              className={`${input} min-w-0 flex-1`}
              placeholder="Título del curso"
              aria-label="Título del curso"
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <select
              className={input}
              aria-label="Área de conocimiento"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <Button type="submit">
              <Plus aria-hidden /> Crear
            </Button>
          </form>
        </Card>
        <Card>
          <CardTitle>Importar y exportar</CardTitle>
          <CardDescription>
            Formato JSON validado (`eal-content` v1). Importar es idempotente por slug.
          </CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => void exportAll()}>
              <Download aria-hidden /> Exportar todo
            </Button>
            <select
              className={input}
              aria-label="Si el curso ya existe"
              value={mode}
              onChange={(e) => setMode(e.target.value as "skip" | "replace")}
            >
              <option value="skip">Si existe: omitir</option>
              <option value="replace">Si existe: reemplazar (con versión)</option>
            </select>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload aria-hidden /> Importar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Archivo de contenido"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Cursos personalizados</CardTitle>
        {courses === null ? (
          <p className="text-muted mt-2 text-sm">Cargando…</p>
        ) : courses.length === 0 ? (
          <p className="text-muted mt-2 text-sm">Todavía no hay cursos personalizados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {courses.map((course) => (
              <li key={course.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="text-foreground min-w-0 flex-1 font-medium hover:underline"
                >
                  {course.title}
                </Link>
                <code className="text-muted text-xs">/c/{course.slug}</code>
                <Badge tone={course.status === "published" ? "success" : "warning"}>
                  {course.status === "published" ? "Publicado" : "Borrador"}
                </Badge>
                <Badge>{course.lessonCount} lección(es)</Badge>
                <Badge>v{course.version}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Auditoría</CardTitle>
        <CardDescription>Últimas acciones administrativas.</CardDescription>
        <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
          {audit.map((entry) => (
            <li key={entry.id} className="flex flex-wrap gap-2">
              <span className="text-muted tabular-nums">
                {new Date(entry.createdAt).toLocaleString("es-AR")}
              </span>
              <code className="text-foreground">{entry.action}</code>
              <span className="text-muted">{entry.entityId}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
