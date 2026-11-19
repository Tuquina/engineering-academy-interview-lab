"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import {
  LEVEL_LABELS,
  compareArchitectures,
  type ArchitectureProfile,
  type DimensionAssessment,
} from "../domain/comparison";

function Level({ assessment }: { assessment: DimensionAssessment }) {
  return (
    <div>
      <span className="text-foreground bg-surface-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold">
        {LEVEL_LABELS[assessment.level]}
      </span>
      <p className="text-muted mt-1 text-sm">{assessment.explanation}</p>
    </div>
  );
}

function ProfileSelect({
  label,
  value,
  profiles,
  onChange,
}: {
  label: string;
  value: string;
  profiles: readonly ArchitectureProfile[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="text-muted flex flex-col gap-1 text-xs">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border bg-surface text-foreground rounded-md border px-2 py-1.5 text-sm"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Compara dos arquitecturas dimensión por dimensión. Las valoraciones son relativas y cualitativas, con la
 * explicación del compromiso: no se muestran números porque no existen valores universales.
 */
export function ArchitectureComparator({ profiles }: { profiles: readonly ArchitectureProfile[] }) {
  const [leftId, setLeftId] = useState(profiles[0]!.id);
  const [rightId, setRightId] = useState(profiles[1]!.id);
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const left = profiles.find((p) => p.id === leftId)!;
  const right = profiles.find((p) => p.id === rightId)!;
  const rows = compareArchitectures(left, right).filter((r) => !onlyDifferences || r.differs);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <ProfileSelect label="Arquitectura A" value={leftId} profiles={profiles} onChange={setLeftId} />
        <ProfileSelect label="Arquitectura B" value={rightId} profiles={profiles} onChange={setRightId} />
        <label className="text-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyDifferences}
            onChange={(e) => setOnlyDifferences(e.target.checked)}
          />
          Mostrar sólo donde difieren
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[left, right].map((profile) => (
          <section key={profile.id} className="border-border bg-surface rounded-lg border p-4">
            <h2 className="text-foreground font-semibold">{profile.title}</h2>
            <p className="text-muted mt-1 text-sm">{profile.summary}</p>
            <h3 className="text-muted mt-3 text-xs font-semibold tracking-wide uppercase">
              Suele convenir cuando
            </h3>
            <ul className="text-foreground mt-1 list-disc pl-5 text-sm">
              {profile.fitsWhen.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {profile.patternSlug && (
              <Link
                href={`/patterns/${profile.patternSlug}`}
                className="text-accent mt-2 inline-block text-sm hover:underline"
              >
                Ver el patrón en la biblioteca
              </Link>
            )}
          </section>
        ))}
      </div>

      {leftId === rightId ? (
        <p className="text-muted text-sm">Elegí dos arquitecturas distintas para ver sus compromisos.</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-left">
            <caption className="sr-only">
              Comparación entre {left.title} y {right.title}
            </caption>
            <thead className="bg-surface-2 text-muted text-xs">
              <tr>
                <th scope="col" className="w-40 px-4 py-2 font-semibold">
                  Dimensión
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  {left.title}
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  {right.title}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.dimension}
                  className={cn("border-border border-t align-top", row.differs && "bg-accent/5")}
                >
                  <th scope="row" className="text-foreground px-4 py-3 text-sm font-medium">
                    {row.label}
                    {row.differs && <span className="text-accent block text-xs font-normal">Compromiso</span>}
                  </th>
                  <td className="px-4 py-3">
                    <Level assessment={row.left} />
                  </td>
                  <td className="px-4 py-3">
                    <Level assessment={row.right} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted text-xs">
        Las valoraciones son relativas entre estas arquitecturas y describen la tendencia típica, no una
        medición: el resultado real depende del equipo, del dominio y de cómo se implemente cada una.
      </p>
    </div>
  );
}
