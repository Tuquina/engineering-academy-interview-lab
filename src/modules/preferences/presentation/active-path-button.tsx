"use client";

import { CheckCircle2, Map as MapIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { usePreferences, usePreferencesActions } from "./preferences-context";

/**
 * Define la ruta como activa (la que usa el dashboard para recomendar). `isDefault` indica si es la ruta por
 * defecto, que se considera activa mientras el usuario no elija otra.
 */
export function ActivePathButton({ pathId, isDefault }: { pathId: string; isDefault: boolean }) {
  const { activePathId } = usePreferences();
  const { update } = usePreferencesActions();
  const active = activePathId === pathId || (activePathId === null && isDefault);

  return active ? (
    <p className="text-success flex items-center gap-1.5 text-sm font-medium" role="status">
      <CheckCircle2 aria-hidden className="size-4" /> Es tu ruta activa
    </p>
  ) : (
    <Button variant="secondary" size="sm" onClick={() => update({ activePathId: pathId })}>
      <MapIcon /> Usar como ruta activa
    </Button>
  );
}
