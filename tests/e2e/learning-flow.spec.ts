import { expect, test } from "@playwright/test";

const LESSON_URL = "/courses/typescript/runtime-vs-sistema-de-tipos";

test.describe("flujo de aprendizaje (modo invitado)", () => {
  test("el dashboard recomienda la primera lección de la ruta activa", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continuar estudiando/ })).toHaveAttribute(
      "href",
      LESSON_URL,
    );
    // Las acciones de fases futuras no deben aparentar funcionar.
    await expect(page.getByRole("button", { name: /Practicar para entrevista/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Resolver un desafío/ })).toBeDisabled();
  });

  test("entrar en la ruta, completar la lección y ver el progreso reflejado", async ({ page }) => {
    await page.goto("/paths/full-stack-ai-platform-engineer");
    await page
      .getByRole("link", { name: /Runtime vs sistema de tipos/ })
      .first()
      .click();
    await expect(page).toHaveURL(LESSON_URL);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Runtime vs sistema de tipos");
    // Los controles interactivos requieren que React haya hidratado la página.
    await page.waitForLoadState("networkidle");

    // Responder un knowledge check.
    const firstCheck = page.locator("section", { hasText: "Knowledge check" }).first();
    await firstCheck.getByLabel(/PaymentReceivedEventSchema\.parse/).check();
    await firstCheck.getByRole("button", { name: "Comprobar" }).click();
    await expect(firstCheck.getByRole("status")).toHaveText("¡Correcto!");

    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.getByText("Lección completada")).toBeVisible();

    await page.goto("/");
    await expect(
      page.getByText("Completaste todas las lecciones publicadas de tu ruta activa."),
    ).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Progreso de la ruta activa" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
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

  test("las secciones planificadas se muestran deshabilitadas, sin enlaces", async ({ page, isMobile }) => {
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
    await expect(nav.getByRole("link", { name: /Interview Arena/ })).toHaveCount(0);
    await expect(nav.getByText("Interview Arena")).toBeVisible();
  });
});
