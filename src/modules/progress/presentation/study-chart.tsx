"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const dayFormat = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric" });

function label(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayFormat.format(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/**
 * Minutos de estudio activo por día. Además del gráfico se expone una tabla oculta visualmente para lectores de
 * pantalla, que no pueden interpretar el SVG.
 */
export function StudyChart({ series }: { series: ReadonlyArray<{ day: string; minutes: number }> }) {
  const data = series.map((point) => ({ ...point, label: label(point.day) }));
  return (
    <figure>
      <div className="h-56 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
              formatter={(value) => [`${String(value)} min`, "Estudio activo"]}
            />
            <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Minutos de estudio activo por día</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Minutos</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <td>{point.label}</td>
              <td>{point.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
