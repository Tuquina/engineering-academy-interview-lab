import type { ProgressStore } from "@/modules/progress/application/progress-store";
import { LocalStorageProgressStore } from "@/modules/progress/infrastructure/local-storage-progress-store";

let browserStore: ProgressStore | null = null;

/**
 * Raíz de composición del progreso en el cliente (modo invitado).
 *
 * En el navegador devuelve un único store sobre `localStorage`; durante el render en servidor devuelve un store
 * sin almacenamiento, que siempre informa progreso vacío (el cliente lo reemplaza tras la hidratación).
 */
export function getProgressStore(): ProgressStore {
  if (typeof window === "undefined") return new LocalStorageProgressStore(null);
  browserStore ??= new LocalStorageProgressStore(safeLocalStorage(), window);
  return browserStore;
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
