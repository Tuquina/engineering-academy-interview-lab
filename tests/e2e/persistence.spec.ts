import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * Fase 6 contra el build de producción y una base PostgreSQL efímera (`db-e2e`). El servidor de E2E tiene el
 * registro abierto y `admin@e2e.test` configurado como administrador.
 */

const PASSWORD = "frase larga de prueba para e2e";
const LESSON = "/courses/typescript/introduccion-a-typescript";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Contraseña/).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  // Si la cuenta ya existe (otra prueba la creó), se inicia sesión. Se espera el mensaje concreto: Next.js tiene su
  // propio anunciador de rutas con `role="alert"`.
  const result = await Promise.race([
    page.waitForURL("**/account").then(() => "ok" as const),
    page
      .getByText("Ya existe una cuenta con ese email.")
      .waitFor()
      .then(() => "exists" as const),
  ]);
  if (result === "exists") {
    await page.getByRole("tab", { name: "Iniciar sesión" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("**/account");
  }
}

async function waitForSync(page: Page) {
  await page.goto("/account");
  await page.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(page.getByTestId("sync-status")).toContainText("Sincronizado");
}

test.describe("persistencia, cuentas y administración (Fase 6)", () => {
  test.skip(({ isMobile }) => isMobile, "La persistencia se verifica en escritorio.");

  test("el progreso se sincroniza entre navegadores y se borra de este navegador al cerrar sesión", async ({
    browser,
  }) => {
    const email = `sync-${randomUUID().slice(0, 8)}@e2e.test`;
    const laptop = await browser.newPage();
    await signIn(laptop, email);
    await expect(laptop.getByTestId("account-name")).toBeVisible();
    await laptop.goto(LESSON);
    await laptop.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(laptop.getByText("Lección completada")).toBeVisible();
    await waitForSync(laptop);

    const phone = await browser.newPage(); // contexto nuevo: otro "dispositivo" sin datos locales
    await signIn(phone, email);
    await waitForSync(phone);
    await phone.goto(LESSON);
    await expect(phone.getByText("Lección completada")).toBeVisible();

    await phone.goto("/account");
    await phone.getByRole("button", { name: "Cerrar sesión" }).click();
    await phone.waitForURL("**/");
    await phone.goto(LESSON);
    await expect(phone.getByText("¿Terminaste la lección?")).toBeVisible();
    await laptop.close();
    await phone.close();
  });

  test("un usuario común no puede administrar: la API responde 403", async ({ page }) => {
    await signIn(page, `alumno-${randomUUID().slice(0, 8)}@e2e.test`);
    const response = await page.request.get("/api/admin/courses");
    expect(response.status()).toBe(403);
    await page.goto("/admin");
    await expect(page.getByTestId("admin-message")).toContainText("requiere una cuenta administradora");
  });

  test("un administrador crea, publica y exporta un curso que ve cualquier visitante", async ({
    page,
    browser,
  }) => {
    await signIn(page, "admin@e2e.test");
    await page.goto("/admin");
    const title = `Curso E2E ${randomUUID().slice(0, 6)}`;
    await page.getByLabel("Título del curso").fill(title);
    await page.getByRole("button", { name: "Crear", exact: true }).click();
    await page.waitForURL("**/admin/courses/**");

    await page.getByRole("button", { name: "Lección", exact: true }).click();
    const editor = page.getByTestId("lesson-editor");
    await editor.getByRole("combobox").first().selectOption("published");
    await editor.getByRole("button", { name: "Agregar bloque" }).click();
    await editor.getByLabel("Texto del párrafo").fill("Una cola desacopla productores de consumidores.");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Guardado");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("status")).toContainText("Curso publicado");

    const exported = await page.request.get("/api/admin/content");
    expect(exported.ok()).toBe(true);
    const file = (await exported.json()) as { format: string; courses: { title: string }[] };
    expect(file.format).toBe("eal-content");
    expect(file.courses.map((c) => c.title)).toContain(title);

    const visitor = await browser.newPage();
    await visitor.goto("/library");
    await visitor.getByTestId("custom-courses").getByText(title).click();
    await visitor.getByRole("link", { name: /Lección 1/ }).click();
    await expect(visitor.getByText("Una cola desacopla productores de consumidores.")).toBeVisible();
    await visitor.close();
  });
});
