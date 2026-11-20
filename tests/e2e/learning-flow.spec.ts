import { expect, test } from "@playwright/test";

const LESSON_URL = "/courses/typescript/runtime-vs-sistema-de-tipos";
/** Primera lección de la ruta activa: la introducción del curso de TypeScript (ADR-0008). */
const FIRST_LESSON_URL = "/courses/typescript/introduccion-a-typescript";

test.describe("flujo de aprendizaje (modo invitado)", () => {
  test("el dashboard recomienda la primera lección de la ruta activa", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continuar estudiando/ })).toHaveAttribute(
      "href",
      FIRST_LESSON_URL,
    );
    await expect(page.getByRole("link", { name: /Practicar para entrevista/ })).toHaveAttribute(
      "href",
      "/interview/quick",
    );
    await expect(page.getByRole("link", { name: /Resolver un desafío/ })).toHaveAttribute(
      "href",
      "/challenges/debounce",
    );
  });

  test("la bienvenida pide elegir una ruta por puesto y la guarda como activa", async ({ page }) => {
    await page.goto("/");
    const welcome = page.getByRole("region", { name: /Preparate para tu próxima búsqueda laboral/ });
    await expect(welcome).toBeVisible();
    await welcome.getByRole("button", { name: /Backend Engineer con Node\.js/ }).click();
    await expect(welcome).toBeHidden();
    await expect(page.getByRole("link", { name: "Backend Engineer con Node.js" })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("region", { name: /Preparate para tu próxima búsqueda laboral/ }),
    ).toBeHidden();
  });

  test("entrar en la ruta, completar la lección y ver el progreso reflejado", async ({ page }) => {
    await page.goto("/paths/full-stack-ai-platform-engineer");
    await page
      .getByRole("link", { name: /Introducción a TypeScript/ })
      .first()
      .click();
    await expect(page).toHaveURL(FIRST_LESSON_URL);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Introducción a TypeScript");
    // Los controles interactivos requieren que React haya hidratado la página.
    await page.waitForLoadState("networkidle");

    // Responder un knowledge check.
    const firstCheck = page.locator("section", { hasText: "Knowledge check" }).first();
    await firstCheck.getByLabel(/El código se ejecuta igual/).check();
    await firstCheck.getByRole("button", { name: "Comprobar" }).click();
    await expect(firstCheck.getByRole("status")).toHaveText("¡Correcto!");

    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.getByText("Lección completada")).toBeVisible();

    // El dashboard avanza a la siguiente lección de la ruta y refleja el progreso parcial.
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Continuar estudiando/ })).toHaveAttribute(
      "href",
      "/courses/typescript/javascript-moderno-esencial",
    );
    const pathProgress = page.getByRole("progressbar", { name: "Progreso de la ruta activa" });
    await expect(pathProgress).not.toHaveAttribute("aria-valuenow", "0");
    await expect(pathProgress).not.toHaveAttribute("aria-valuenow", "100");
  });

  test("la tabla de contenidos enlaza a secciones existentes", async ({ page, isMobile }) => {
    test.skip(isMobile, "La tabla de contenidos sólo se muestra en pantallas anchas.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(LESSON_URL);
    const links = page.getByRole("navigation", { name: "Contenido de la lección" }).getByRole("link");
    const hrefs = await links.evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(8);
    for (const href of hrefs) {
      await expect(page.locator(href!), href!).toHaveCount(1);
    }
  });

  test("no hay scroll horizontal involuntario en la lección", async ({ page }) => {
    await page.goto(LESSON_URL);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("la navegación principal enlaza todas las secciones disponibles", async ({ page, isMobile }) => {
    await page.goto("/library");
    if (isMobile) {
      // El botón necesita la hidratación: se reintenta hasta que el diálogo quede abierto.
      await expect(async () => {
        await page.getByRole("button", { name: "Abrir navegación" }).click();
        await expect(page.getByRole("dialog", { name: "Navegación" })).toBeVisible({ timeout: 1000 });
      }).toPass();
    }
    const nav = page.getByRole("navigation", { name: "Navegación principal" }).last();
    await expect(nav.getByRole("link", { name: "Biblioteca" })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Administración de contenido/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /AI Agents Lab/ })).toBeVisible();
  });
});
