import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import matter from "gray-matter";

const contentRoot = path.resolve(import.meta.dirname, "../../content");
const read = (relative: string) => readFileSync(path.join(contentRoot, relative), "utf8");

/** Reemplaza el contenido de un modelo de Monaco (el editor expone `window.monaco`). */
async function setEditorValue(page: Page, pathSuffix: string, value: string) {
  await page.waitForFunction(
    (suffix) =>
      (
        window as unknown as { monaco?: { editor: { getModels(): Array<{ uri: { path: string } }> } } }
      ).monaco?.editor
        .getModels()
        .some((m) => m.uri.path.endsWith(suffix)),
    pathSuffix,
  );
  await page.evaluate(
    ({ suffix, text }) => {
      const monaco = (
        window as unknown as {
          monaco: { editor: { getModels(): Array<{ uri: { path: string }; setValue(v: string): void }> } };
        }
      ).monaco;
      monaco.editor
        .getModels()
        .find((m) => m.uri.path.endsWith(suffix))!
        .setValue(text);
    },
    { suffix: pathSuffix, text: value },
  );
}

test.describe("laboratorios (Fase 3)", () => {
  test.skip(({ isMobile }) => isMobile, "Los laboratorios con editor se verifican en escritorio.");

  test("un challenge de código: el starter falla y la solución pasa todos los tests", async ({ page }) => {
    await page.goto("/challenges/debounce");
    const run = page.getByRole("button", { name: /Ejecutar tests/ });
    await expect(run).toBeEnabled({ timeout: 30_000 });
    await setEditorValue(page, "/challenges/debounce/solution.ts", read("challenges/debounce/starter.ts"));

    await run.click();
    const status = page.getByRole("status").filter({ hasText: "tests aprobados" });
    await expect(status).toBeVisible({ timeout: 30_000 });
    await expect(status).not.toHaveText(/^(\d+)\/\1 tests aprobados$/);

    await setEditorValue(page, "/challenges/debounce/solution.ts", read("challenges/debounce/solution.ts"));
    await run.click();
    await expect(page.getByText("Challenge resuelto").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/oculto/).first()).toBeVisible();

    // El intento queda registrado y se refleja en el catálogo.
    await page.goto("/challenges");
    await expect(
      page.getByRole("link", { name: /Implementar debounce/ }).getByLabel("Resuelto"),
    ).toBeVisible();
  });

  test("un bucle infinito se corta sin congelar la página", async ({ page }) => {
    await page.goto("/challenges/debounce");
    const run = page.getByRole("button", { name: /Ejecutar tests/ });
    await expect(run).toBeEnabled({ timeout: 30_000 });
    await setEditorValue(
      page,
      "/challenges/debounce/solution.ts",
      "export function debounce(): never { while (true) {} }\n",
    );
    await run.click();
    await expect(page.getByText(/superó 15 s y se detuvo/)).toBeVisible({ timeout: 30_000 });
    // La página sigue respondiendo.
    await expect(page.getByRole("tab", { name: "Pistas (0/3)" })).toBeEnabled();
  });

  test("el playground de TypeScript ejecuta y muestra la consola", async ({ page }) => {
    await page.goto("/lab");
    const run = page.getByRole("button", { name: /^Ejecutar/ });
    await expect(run).toBeEnabled({ timeout: 30_000 });
    await run.click();
    const output = page.getByRole("tabpanel");
    await expect(output.getByText("A: síncrono")).toBeVisible({ timeout: 30_000 });
    await expect(output.getByText("B: setTimeout 0")).toBeVisible();
    await expect(output.getByText(/Web Worker aislado/)).toBeVisible();
  });

  test("el SQL Lab ejecuta PostgreSQL en el navegador y corrige un ejercicio", async ({ page }) => {
    const exercise = matter(read("sql/exercises/01-overdue-by-customer.md")).data as { solution: string };
    await page.goto("/database-lab/overdue-by-customer");
    const check = page.getByRole("button", { name: /Comprobar/ });
    await expect(check).toBeEnabled({ timeout: 60_000 });

    await setEditorValue(page, "/sql/sql.overdue-by-customer.sql", "SELECT full_name FROM customers;");
    await check.click();
    await expect(page.getByRole("status")).toContainText(/columnas/, { timeout: 30_000 });

    await setEditorValue(page, "/sql/sql.overdue-by-customer.sql", exercise.solution);
    await check.click();
    await expect(page.getByRole("status")).toHaveText(/¡Correcto!/, { timeout: 30_000 });
    await expect(page.getByRole("cell", { name: "Elena Suárez" })).toBeVisible();
  });

  test("el SQL Playground muestra errores de PostgreSQL con su posición", async ({ page }) => {
    await page.goto("/database-lab");
    const run = page.getByRole("button", { name: /^Ejecutar/ });
    await expect(run).toBeEnabled({ timeout: 60_000 });
    await expect(page.getByText("customers").first()).toBeVisible();
    await setEditorValue(page, "/sql/playground.sql", "SELECT nombre FROM customers;");
    await run.click();
    const error = page.getByRole("alert").filter({ hasText: "SQLSTATE" });
    await expect(error).toContainText(/nombre/, { timeout: 30_000 });
    await expect(error).toContainText("^");
  });

  test("un challenge de diseño guarda la respuesta y la autoevaluación", async ({ page }) => {
    await page.goto("/challenges/rate-limiting-policy");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Tu diseño").fill("Token bucket por tenant en Redis con script Lua.");
    await page.getByRole("checkbox", { name: /Algoritmo justificado/ }).check();
    await expect(page.getByRole("progressbar", { name: "Cobertura de la rúbrica" })).not.toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.getByLabel("Tu diseño")).toHaveValue(
      "Token bucket por tenant en Redis con script Lua.",
    );
    await expect(page.getByRole("checkbox", { name: /Algoritmo justificado/ })).toBeChecked();
  });

  test("el challenge de React ejecuta los tests de Sandpack en el navegador", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/challenges/react-use-effect");
    await expect(page.getByText("Corregir un useEffect problemático").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /App\.tsx/ }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/requiere conexión a internet/)).toBeVisible();

    // Sandpack ejecuta los tests con Jest en el navegador (bundler de CodeSandbox, requiere internet).
    // El starter tiene bugs: al completarse, queda registrado un intento no resuelto.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const raw = localStorage.getItem("eal:practice");
            const attempts = raw
              ? (JSON.parse(raw) as { attempts?: Record<string, { solvedAt: string | null }> }).attempts
              : undefined;
            return attempts?.["challenge.react-use-effect"] ?? null;
          }),
        { timeout: 120_000, intervals: [2_000] },
      )
      .toMatchObject({ solvedAt: null });

    // Con la solución de referencia como borrador guardado, los mismos tests pasan dentro de Sandpack.
    const solution = read("challenges/react-use-effect/solution.tsx");
    await page.evaluate((code) => {
      const state = JSON.parse(localStorage.getItem("eal:practice")!) as { drafts: Record<string, string> };
      state.drafts["challenge.react-use-effect"] = code;
      localStorage.setItem("eal:practice", JSON.stringify(state));
    }, solution);
    await page.reload();
    await expect(page.getByText("Challenge resuelto: todos los tests pasan.")).toBeVisible({
      timeout: 120_000,
    });
  });
});
