"use client";

import { Table2 } from "lucide-react";
import type { TableSchema } from "../application/sql-engine";

/** Explorador del esquema: tablas, columnas, tipos y cantidad de filas. Permite consultar una tabla con un clic. */
export function SchemaBrowser({
  schema,
  onPreviewTable,
}: {
  schema: readonly TableSchema[] | null;
  onPreviewTable: (table: string) => void;
}) {
  if (!schema) return <p className="text-muted text-sm">Cargando esquema…</p>;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {schema.map((table) => (
        <li key={table.name}>
          <details>
            <summary className="hover:bg-surface-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1">
              <Table2 aria-hidden className="text-accent size-3.5" />
              <span className="text-foreground font-mono text-xs">{table.name}</span>
              <span className="text-muted ml-auto text-xs tabular-nums">{table.rowCount}</span>
            </summary>
            <ul className="mt-1 mb-2 ml-6 flex flex-col gap-0.5 font-mono text-xs">
              {table.columns.map((column) => (
                <li key={column.name} className="flex justify-between gap-3">
                  <span className="text-foreground">{column.name}</span>
                  <span className="text-muted">
                    {column.type}
                    {column.nullable ? "" : " · not null"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onPreviewTable(table.name)}
              className="text-accent mb-2 ml-6 text-xs hover:underline"
            >
              Ver las primeras filas
            </button>
          </details>
        </li>
      ))}
    </ul>
  );
}
