import { expect, test } from "@playwright/test";

test.describe("AI Agents Lab (Fase 5)", () => {
  test.skip(({ isMobile }) => isMobile, "El laboratorio de agentes se verifica en escritorio.");

  test("el playground conversa con el proveedor local, ejecuta herramientas y lo identifica como simulación", async ({
    page,
  }) => {
    await page.goto("/agents/agent-collections");
    await page.getByRole("tab", { name: "Playground" }).click();
    await expect(page.getByTestId("provider-notice")).toContainText("simulación, no es un LLM");
    await page.getByRole("button", { name: "Te pago el 12" }).click();
    const reply = page.getByTestId("agent-reply").last();
    await expect(reply).toContainText("asistente virtual");
    await expect(reply).toContainText("12/03/2026");
    await page
      .getByText(/Traza: \d+ paso\(s\)/)
      .last()
      .click();
    await expect(page.getByText("register_payment_promise").first()).toBeVisible();
  });

  test("guardar una versión no permite publicarla sin evaluarla", async ({ page }) => {
    await page.goto("/agents/agent-collections");
    await page.getByLabel("Plazo máximo de promesa (días)").fill("10");
    await page.getByRole("tab", { name: "Versiones" }).click();
    await page.getByLabel("Nota de la versión").fill("Plazo de 10 días");
    await page.getByRole("button", { name: "Guardar versión" }).click();
    const v3 = page.getByTestId("version-3");
    await expect(v3).toContainText("Plazo de 10 días");
    await v3.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("status")).toContainText("Ejecutá la suite de evaluación sobre la versión 3");
    await expect(page.getByRole("table")).toContainText("policies.maxPromiseDays");
  });

  test("el Tool Calling Simulator rechaza argumentos que no cumplen el esquema", async ({ page }) => {
    await page.goto("/agents/tools");
    await page.getByRole("combobox", { name: /^Herramienta/ }).selectOption("register_payment_promise");
    await page
      .getByLabel(/Argumentos \(JSON/)
      .fill('{ "customerId": "c-001", "amountCents": "mucho", "promisedDate": "2026-03-12" }');
    await page.getByRole("button", { name: "Ejecutar" }).click();
    await expect(page.getByText("Argumentos inválidos")).toBeVisible();
    await expect(page.getByText(/amountCents:/)).toBeVisible();
  });

  test("la memoria evita contactar antes de la fecha prometida", async ({ page }) => {
    await page.goto("/agents/memory");
    for (let step = 0; step < 3; step++) {
      await page.getByRole("button", { name: /^Avanzar/ }).click();
    }
    await expect(page.getByTestId("eligibility-decision")).toContainText("no contactar todavía");
    await expect(page.getByText(/El sistema no tiene pagos pendientes/)).toBeVisible();
  });

  test("el Eval Playground compara v1 contra v2 y detecta mejoras significativas", async ({ page }) => {
    await page.goto("/agents/evals");
    await page.getByLabel("Versión A").selectOption("1");
    await page.getByLabel("Versión B").selectOption("2");
    await page.getByRole("button", { name: "Ejecutar evaluación" }).click();
    await expect(page.getByTestId("summary-v1")).toContainText("Quality gate no aprobado");
    await expect(page.getByTestId("summary-v2")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Mejora" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Deuda no reconocida" }).click();
    await expect(page.getByTestId("eval-run").first()).toBeVisible();
  });
});
