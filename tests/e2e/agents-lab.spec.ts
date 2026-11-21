import { expect, test } from "@playwright/test";

test.describe("AI Agents Lab (Fase 5)", () => {
  test.skip(({ isMobile }) => isMobile, "El laboratorio de agentes se verifica en escritorio.");

  test("el playground conversa con el proveedor local, ejecuta herramientas y lo identifica como simulación", async ({
    page,
  }) => {
    await page.goto("/agents/agent-support");
    await page.getByRole("tab", { name: "Playground" }).click();
    await expect(page.getByTestId("provider-notice")).toContainText("simulación, no es un LLM");
    await page.getByRole("button", { name: "Mi pedido está atrasado y lo necesito para un regalo" }).click();
    const reply = page.getByTestId("agent-reply").last();
    await expect(reply).toContainText("asistente virtual");
    await expect(reply).toContainText("Cupón del 15 %");
    await page
      .getByText(/Traza: \d+ paso\(s\)/)
      .last()
      .click();
    await expect(page.getByText("get_allowed_compensations").first()).toBeVisible();
  });

  test("guardar una versión no permite publicarla sin evaluarla", async ({ page }) => {
    await page.goto("/agents/agent-support");
    await page.getByLabel("Plazo máximo para el retiro (días desde hoy)").fill("10");
    await page.getByRole("tab", { name: "Versiones" }).click();
    await page.getByLabel("Nota de la versión").fill("Plazo de 10 días");
    await page.getByRole("button", { name: "Guardar versión" }).click();
    const v3 = page.getByTestId("version-3");
    await expect(v3).toContainText("Plazo de 10 días");
    await v3.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("status")).toContainText("Ejecutá la suite de evaluación sobre la versión 3");
    await expect(page.getByRole("table")).toContainText("policies.maxPickupDays");
  });

  test("el Tool Calling Simulator rechaza argumentos que no cumplen el esquema", async ({ page }) => {
    await page.goto("/agents/tools");
    await page.getByRole("combobox", { name: /^Herramienta/ }).selectOption("schedule_return");
    await page
      .getByLabel(/Argumentos \(JSON/)
      .fill('{ "customerId": "c-002", "orderId": 1002, "pickupDate": "2026-03-09" }');
    await page.getByRole("button", { name: "Ejecutar" }).click();
    await expect(page.getByText("Argumentos inválidos")).toBeVisible();
    await expect(page.getByText(/orderId:/)).toBeVisible();
  });

  test("la memoria evita avisar antes de la víspera del retiro", async ({ page }) => {
    await page.goto("/agents/memory");
    for (let step = 0; step < 3; step++) {
      await page.getByRole("button", { name: /^Avanzar/ }).click();
    }
    await expect(page.getByTestId("eligibility-decision")).toContainText("no contactar todavía");
    await expect(page.getByText(/El sistema todavía tiene la devolución/)).toBeVisible();
  });

  test("el Eval Playground compara v1 contra v2 y detecta mejoras significativas", async ({ page }) => {
    await page.goto("/agents/evals");
    await page.getByLabel("Versión A").selectOption("1");
    await page.getByLabel("Versión B").selectOption("2");
    await page.getByRole("button", { name: "Ejecutar evaluación" }).click();
    await expect(page.getByTestId("summary-v1")).toContainText("Quality gate no aprobado");
    await expect(page.getByTestId("summary-v2")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Mejora" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Cargo no reconocido" }).click();
    await expect(page.getByTestId("eval-run").first()).toBeVisible();
  });
});
