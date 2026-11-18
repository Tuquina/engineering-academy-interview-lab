"use client";

import { useState, type ReactNode } from "react";
import { getProgressStore } from "@/infrastructure/composition/progress-client";
import { ProgressProvider } from "@/modules/progress/presentation/progress-context";

/** Proveedores de cliente de toda la aplicación. Aquí se elige la implementación concreta de cada puerto. */
export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(getProgressStore);
  return <ProgressProvider store={store}>{children}</ProgressProvider>;
}
