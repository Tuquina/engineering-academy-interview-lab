import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Sin `globals: true`, Testing Library no registra su limpieza automática: se hace explícita.
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
