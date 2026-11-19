import { expect, test } from "@playwright/test";

test.describe("patrones y arquitectura (Fase 4)", () => {
  test("un patrón muestra sus secciones y el diagrama interactivo se inspecciona y recorre", async ({
    page,
  }) => {
    await page.goto("/patterns");
    await expect(page.getByRole("link", { name: /Transactional Outbox/ })).toBeVisible();
    await page.getByRole("link", { name: /Transactional Outbox/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Transactional Outbox" })).toBeVisible();
    for (const section of [
      "Definición",
      "Problema que resuelve",
      "Ejemplo incorrecto",
      "Implementación correcta",
      "Ejercicio",
      "Cuándo no conviene usarlo",
      "Preguntas de entrevista",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
    }
    await page.waitForLoadState("networkidle");

    const detail = page.getByRole("region", { name: "Detalle del elemento seleccionado" }).first();
    await page.getByRole("button", { name: "Relay", exact: true }).first().click();
    await expect(detail).toContainText("FOR UPDATE SKIP LOCKED");

    await page.getByRole("button", { name: "Comenzar recorrido" }).first().click();
    await expect(page.getByText(/Paso 1 de 4/).first()).toBeVisible();
    await expect(page.getByText("1. El problema: escritura doble")).toBeVisible();
  });

  test("el comparador muestra los compromisos entre dos arquitecturas", async ({ page }) => {
    await page.goto("/patterns/compare");
    await page.waitForLoadState("networkidle");
    // Monolito en capas frente a monolito modular: difieren en complejidad, mantenibilidad, testing y acoplamiento.
    await page.getByLabel("Arquitectura B").selectOption({ label: "Monolito modular" });
    const table = page.getByRole("table");
    await expect(table.getByRole("rowheader")).toHaveCount(10);
    await page.getByLabel("Mostrar sólo donde difieren").check();
    await expect(table.getByRole("rowheader")).toHaveCount(4);
    await expect(table.getByText("Compromiso")).toHaveCount(4);
  });
});

test.describe("System Design Studio e Interview Arena (Fase 4)", () => {
  test.skip(({ isMobile }) => isMobile, "El canvas y las sesiones se verifican en escritorio.");

  test("el canvas agrega, conecta, guarda y exporta un diagrama", async ({ page }) => {
    await page.goto("/system-design/canvas");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Nombre del diagrama").fill("Webhooks confiables");
    await page.getByRole("button", { name: "Agregar API Gateway" }).click();
    await page.getByRole("button", { name: "Agregar Cola de mensajes" }).click();
    await page.getByRole("button", { name: "Agregar Workers" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(3);

    await page.getByLabel("Desde").selectOption({ label: "API Gateway" });
    await page.getByLabel("Hacia").selectOption({ label: "Cola de mensajes" });
    await page.getByRole("button", { name: "Conectar", exact: true }).click();
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    await page.getByText("Resumen en texto del diseño").click();
    await expect(page.getByText("API Gateway → Cola de mensajes")).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar JSON" }).click();
    expect((await download).suggestedFilename()).toBe("webhooks-confiables.json");

    // Se guarda en el navegador: al recargar, el diagrama sigue ahí.
    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
    await expect(page.getByLabel("Nombre del diagrama")).toHaveValue("Webhooks confiables");
  });

  test("un simulador muestra la ráfaga en el borde de la ventana fija", async ({ page }) => {
    await page.goto("/system-design/simulators/rate-limiting");
    await expect(page.getByText("Modelo simplificado.")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Ir al final" }).click();
    await expect(page.getByText("20 (límite 10)")).toBeVisible();
    await page.getByLabel("Algoritmo").selectOption({ label: "Ventana deslizante" });
    await page.getByRole("button", { name: "Ir al final" }).click();
    await expect(page.getByText("10 (límite 10)")).toBeVisible();
  });

  test("un desafío de arquitectura guarda notas, diagrama y autoevaluación", async ({ page }) => {
    await page.goto("/system-design/challenges/reliable-webhooks");
    await page.waitForLoadState("networkidle");
    await page
      .getByLabel("Notas de la fase Aclarar requerimientos")
      .fill("Entrega al menos una vez con firma HMAC.");
    await page.getByRole("button", { name: /Diseñar los componentes/ }).click();
    await page.getByRole("button", { name: "Agregar Webhook endpoint" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await page.getByRole("checkbox", { name: /Ningún evento se pierde/ }).check();
    await page.waitForTimeout(800);

    await page.reload();
    await expect(page.getByLabel("Notas de la fase Aclarar requerimientos")).toHaveValue(
      "Entrega al menos una vez con firma HMAC.",
    );
    await expect(page.getByRole("checkbox", { name: /Ningún evento se pierde/ })).toBeChecked();
    await page.getByRole("button", { name: /Diseñar los componentes/ }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
  });

  test("una entrevista rápida registra la autoevaluación, los puntos débiles y la recomendación", async ({
    page,
  }) => {
    await page.goto("/interview/quick");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Comenzar" }).click();

    await page.getByLabel("Tu respuesta").fill("Respuesta de prueba.");
    await page.getByRole("button", { name: "Ver criterios y autoevaluarme" }).click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Confirmar autoevaluación" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Cubriste" })).toContainText(
      /Cubriste 1 de \d criterios/,
    );
    await expect(page.getByRole("heading", { name: "Una respuesta sólida" })).toBeVisible();
    await page.getByRole("button", { name: /^Siguiente/ }).click();
    await page.getByRole("button", { name: "Terminar ahora" }).click();

    await expect(page.getByRole("heading", { name: "Resumen de la sesión" })).toBeVisible();
    await expect(page.getByText(/1\/\d criterios/)).toBeVisible();

    await page.goto("/interview");
    await expect(page.getByText("Quick Interview").last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Repasar puntos débiles" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: /Repasar 1 pregunta de entrevista/ })).toBeVisible();

    await page.goto("/interview/review");
    await expect(page.getByText("Tenés 1 pregunta con criterios faltantes.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Comenzar" })).toBeEnabled();
  });

  test("el live coding con reloj usa el mismo editor y tests reales", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/interview/live-coding");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Problema").selectOption({ label: "Implementar debounce" });
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page.getByRole("heading", { name: "Implementar debounce" }).first()).toBeVisible();
    const run = page.getByRole("button", { name: /Ejecutar tests/ });
    await expect(run).toBeEnabled({ timeout: 30_000 });
    await run.click();
    await expect(page.getByText(/Última ejecución: \d+\/\d+ tests/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Terminar live coding" }).click();
    await expect(page.getByText(/Live coding: \d+\/\d+ tests en la última ejecución/)).toBeVisible();
  });
});
