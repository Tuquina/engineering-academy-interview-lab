import type { ExternalStore } from "@/shared/kernel/external-store";
import type { ProgressState } from "../domain/progress";

/**
 * Puerto de persistencia del progreso. Hoy lo implementa `localStorage` (modo invitado); en la Fase 6 se sumará
 * una implementación respaldada por la API y PostgreSQL.
 */
export type ProgressStore = ExternalStore<ProgressState>;
