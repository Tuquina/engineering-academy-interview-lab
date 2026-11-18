import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra un servidor ya levantado. En local se ejecuta desde el servicio `e2e` de Docker Compose, que comparte la
 * red del build de producción (`web-e2e`) y abre la app en `http://localhost:3000`: un contexto seguro para el
 * navegador, como en el uso real (Sandpack necesita `crypto.subtle`, que sólo existe en contextos seguros).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
