"use client";

import { Keyboard, Trash2 } from "lucide-react";
import { useState } from "react";
import { setTheme, useTheme, type Theme } from "@/shared/layout/theme-toggle";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";
import { NEW_CARDS_PER_DAY_RANGE, READING_FONT_SIZES, READING_FONT_SIZE_LABELS } from "../domain/preferences";
import { usePreferences, usePreferencesActions } from "./preferences-context";

/** Prefijo de todas las claves locales de la plataforma. */
const LOCAL_KEY_PREFIX = "eal:";

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], description: "Abrir el buscador global (⌘ K en macOS)" },
  { keys: [","], description: "Lección anterior" },
  { keys: ["."], description: "Lección siguiente" },
  { keys: ["Espacio"], description: "Flashcards: mostrar la respuesta" },
  { keys: ["1", "2", "3", "4"], description: "Flashcards: Otra vez · Difícil · Bien · Fácil" },
  { keys: ["Esc"], description: "Cerrar diálogos" },
] as const;

/** Grupo de opciones exclusivas con semántica de radio y estilo de botones segmentados. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-foreground mb-2 text-sm font-medium">{label}</legend>
      <div className="border-border bg-surface-2 inline-flex rounded-md border p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2",
              value === option.value
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={label}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Panel de configuración: apariencia, lectura, flashcards, atajos y datos locales. */
export function SettingsPanel() {
  const preferences = usePreferences();
  const { update } = usePreferencesActions();
  const theme = useTheme();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const resetData = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5">
        <div>
          <CardTitle>Apariencia y lectura</CardTitle>
          <CardDescription>Se aplican al instante y se recuerdan en este navegador.</CardDescription>
        </div>
        <Segmented<Theme>
          label="Tema"
          value={theme}
          options={[
            { value: "dark", label: "Oscuro" },
            { value: "light", label: "Claro" },
          ]}
          onChange={setTheme}
        />
        <Segmented
          label="Tamaño del texto de las lecciones"
          value={preferences.readingFontSize}
          options={READING_FONT_SIZES.map((size) => ({ value: size, label: READING_FONT_SIZE_LABELS[size] }))}
          onChange={(readingFontSize) => update({ readingFontSize })}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Flashcards</CardTitle>
        <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
          Tarjetas nuevas por día
          <input
            type="number"
            inputMode="numeric"
            min={NEW_CARDS_PER_DAY_RANGE.min}
            max={NEW_CARDS_PER_DAY_RANGE.max}
            value={preferences.newFlashcardsPerDay}
            onChange={(event) => update({ newFlashcardsPerDay: Number(event.target.value) })}
            className="border-border bg-background w-28 rounded-md border px-3 py-1.5 font-normal"
          />
        </label>
        <CardDescription>
          Limitar las nuevas mantiene sostenible la carga de repasos de los próximos días. Entre{" "}
          {NEW_CARDS_PER_DAY_RANGE.min} y {NEW_CARDS_PER_DAY_RANGE.max}.
        </CardDescription>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle className="flex items-center gap-2">
          <Keyboard aria-hidden className="text-muted size-4" /> Atajos de teclado
        </CardTitle>
        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.description} className="contents">
              <dt className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="border-border bg-surface-2 rounded border px-1.5 py-0.5 font-mono text-xs"
                  >
                    {key}
                  </kbd>
                ))}
              </dt>
              <dd className="text-muted mb-2 sm:mb-0">{shortcut.description}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Datos locales</CardTitle>
        <CardDescription>
          Sin cuenta, el progreso, las notas y los laboratorios viven sólo en este navegador: exportalos como
          respaldo (abajo) antes de borrar. Con una cuenta, borrar acá sólo limpia este navegador; tus datos
          siguen en la cuenta y vuelven a sincronizarse.
        </CardDescription>
        <div className="flex flex-wrap gap-3">
          {!confirmingReset ? (
            <Button variant="secondary" onClick={() => setConfirmingReset(true)}>
              <Trash2 /> Borrar datos locales
            </Button>
          ) : (
            <div
              role="alert"
              className="border-danger/50 bg-danger/8 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2"
            >
              <span className="text-foreground text-sm">
                Se borrarán los datos de este navegador. Sin cuenta, no se puede deshacer.
              </span>
              <Button size="sm" className="bg-danger hover:bg-danger/90 text-white" onClick={resetData}>
                Sí, borrar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingReset(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
