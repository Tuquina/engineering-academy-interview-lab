import { expect, test, type Page } from "@playwright/test";

const LESSON_URL = "/courses/typescript/runtime-vs-sistema-de-tipos";

/** Espera la hidratación: los controles interactivos no responden antes. */
async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

test.describe("herramientas de estudio (Fase 2)", () => {
  test("el buscador global encuentra apartados de lecciones con Ctrl+K", async ({ page, isMobile }) => {
    await gotoHydrated(page, "/");
    if (isMobile) await page.getByRole("button", { name: "Buscar (Ctrl+K)" }).click();
    else await page.keyboard.press("Control+k");

    const input = page.getByRole("combobox", { name: /Buscar lecciones/ });
    await expect(input).toBeFocused();
    await input.fill("allsettled");
    await expect(page.getByRole("option").first()).toContainText(/Promise|Combinadores|allSettled/i);
    await input.press("Enter");
    await expect(page).toHaveURL(/\/courses\/typescript\/promises-task-completablefuture/);
  });

  test("las respuestas a knowledge checks persisten entre visitas", async ({ page }) => {
    await gotoHydrated(page, LESSON_URL);
    const check = page.locator("section", { hasText: "Knowledge check" }).first();
    await check.getByLabel(/body as PaymentReceivedEvent/).check();
    await check.getByRole("button", { name: "Comprobar" }).click();
    await expect(check.getByRole("status")).toContainText("No es correcta");

    await gotoHydrated(page, LESSON_URL);
    await expect(
      page
        .locator("section", { hasText: "Knowledge check" })
        .first()
        .getByText(/Última respuesta: incorrecta/),
    ).toBeVisible();

    // El error reciente aparece como recomendación, con su motivo.
    await gotoHydrated(page, "/");
    await expect(page.getByText(/Tu última respuesta a una de sus preguntas fue incorrecta/)).toBeVisible();
  });

  test("notas y marcadores se guardan y aparecen en Guardados", async ({ page }) => {
    await gotoHydrated(page, LESSON_URL);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Guardada" })).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Notas de la lección").fill("Validar siempre en los límites con Zod.");
    await expect(page.getByText("Guardado en este navegador")).toBeVisible();

    await gotoHydrated(page, "/saved");
    await expect(page.getByRole("link", { name: /Runtime vs sistema de tipos/ }).first()).toBeVisible();
    await expect(page.getByText("Validar siempre en los límites con Zod.")).toBeVisible();
  });

  test("una sesión de flashcards califica tarjetas y avanza la cola", async ({ page }) => {
    await gotoHydrated(page, "/flashcards");
    const card = page.getByRole("article", { name: "Tarjeta de estudio" });
    const firstQuestion = await card.locator("p").first().textContent();

    await card.getByRole("button", { name: /Mostrar respuesta/ }).click();
    await expect(card.getByRole("button", { name: /Bien/ })).toContainText("1 día");
    await card.getByRole("button", { name: /Bien/ }).click();

    await expect(card.locator("p").first()).not.toHaveText(firstQuestion ?? "");
    await expect(page.getByText("Repasadas hoy").locator("..")).toContainText("1");
  });

  test("las cheatsheets se pueden filtrar y marcar como favoritas", async ({ page }) => {
    await gotoHydrated(page, "/cheatsheets");
    await page.getByRole("button", { name: /Agregar a favoritas: Node.js event loop/ }).click();
    await page.getByLabel("Sólo favoritas").check();
    await expect(page.getByRole("link", { name: /Node.js event loop/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Promises y async\/await/ })).toHaveCount(0);
  });

  test("el tamaño de lectura se aplica antes del primer pintado tras recargar", async ({ page }) => {
    await gotoHydrated(page, "/settings");
    await page.getByText("Grande", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "lg");
    await page.goto(LESSON_URL);
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "lg");
  });

  test("las estadísticas muestran métricas registradas y el gráfico accesible", async ({ page }) => {
    await gotoHydrated(page, "/stats");
    await expect(page.getByRole("heading", { level: 1, name: "Estadísticas y progreso" })).toBeVisible();
    await expect(page.getByText("Racha actual")).toBeVisible();
    await expect(page.locator("table caption", { hasText: "Minutos de estudio activo por día" })).toHaveCount(
      1,
    );
  });
});
