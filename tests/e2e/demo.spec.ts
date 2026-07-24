import { expect, test } from "@playwright/test";

test("login con tab Accedi e Registrati", async ({ page }) => {
  await page.goto("/login");

  const signInTab = page.getByRole("tab", { name: "Accedi" });
  const signUpTab = page.getByRole("tab", { name: "Registrati" });
  await expect(signInTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Entra in Fleai." })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
  await expect(page.getByRole("button", { name: "Accedi", exact: true })).toBeVisible();

  await signUpTab.click();
  await expect(signUpTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Crea il tuo spazio." })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("minlength", "8");
  await expect(page.getByLabel("Conferma password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Crea il tuo account/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Registrati senza password/i })).toBeVisible();
  await page.getByLabel("Email").fill("test-login@fleai.example");
  await page.getByLabel("Password", { exact: true }).fill("password-sicura");
  await page.getByLabel("Conferma password", { exact: true }).fill("password-diversa");
  await page.getByRole("button", { name: /Crea il tuo account/i }).click();
  await expect(page.locator(".auth-feedback[role='alert']")).toHaveText("Le password non coincidono.");

  await signUpTab.press("ArrowLeft");
  await expect(signInTab).toBeFocused();
  await expect(page.getByRole("heading", { name: "Entra in Fleai." })).toBeVisible();

  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 1000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow login a ${width}px`).toBeLessThanOrEqual(1);
  }
});

test("Hunting demo: foto, ripristino e report", async ({ page }) => {
  await page.goto("/app/hunt/new");
  await expect(page.getByRole("heading", { name: /VALE LA PENA/i })).toBeVisible();
  const photo = await page.screenshot({ type: "jpeg", quality: 80 });
  await page.getByLabel("Aggiungi foto 1").setInputFiles({ name: "oggetto.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(page.getByText("(1/3)")).toBeVisible();
  await page.getByLabel("Nome o modello").fill("Sedia cantilever vintage");
  await page.getByRole("button", { name: /Cerca e valuta/i }).click();
  await expect(page).toHaveURL(/demo-report/);
  await expect(page.getByText(/Buon acquisto per rivendita/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /eBay Italia/i })).toHaveAttribute("target", "_blank");
});

test("Shop demo: approvazione e pubblicazione", async ({ page }) => {
  await page.goto("/app/items/new");
  await page.getByLabel(/Confermo che descrizione/i).check();
  await page.getByRole("button", { name: /Pubblica nello shop Fleai/i }).click();
  await expect(page).toHaveURL(/\/s\/officina-ritrovata\/sedia-cesca-vintage/);
  await expect(page.getByRole("heading", { name: /Sedia cantilever vintage/i })).toBeVisible();
});

test("Shop demo: il click apre la scheda privata senza avviare AI", async ({ page }) => {
  await page.goto("/app/shop");
  await page.getByRole("heading", { name: /Sedia cantilever vintage/i }).click();
  await expect(page).toHaveURL(/\/app\/items\/11111111-1111-4111-8111-111111111111$/);
  await expect(page.getByRole("heading", { name: /Sedia cantilever vintage/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Cosa vuoi fare/i })).toBeVisible();
  await expect(page.getByText(/Aprire questa pagina non avvia ricerche o generazioni/i)).toBeVisible();
  expect(page.url()).not.toContain("/runs/");
});

test("workspace responsive senza overflow e azioni oggetto subito visibili", async ({ page }) => {
  const routes = [
    "/app",
    "/app/shop",
    "/app/items/11111111-1111-4111-8111-111111111111",
    "/app/hunt/new",
    "/app/items/new",
  ];

  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 1000 });
    for (const route of routes) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow ${route} a ${width}px`).toBeLessThanOrEqual(1);
    }
  }

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/app/items/11111111-1111-4111-8111-111111111111");
  const actions = await page.getByRole("heading", { name: /Cosa vuoi fare/i }).boundingBox();
  const photos = await page.getByRole("heading", { name: /Foto dell’oggetto/i }).boundingBox();
  expect(actions?.y ?? Infinity).toBeLessThan(photos?.y ?? 0);
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
});

test("un annuncio demo è dichiarato e non accetta prenotazioni reali", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/s/officina-ritrovata/sedia-cesca-vintage");
  await expect(page.getByRole("heading", { name: "Questo è un annuncio demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Crea un annuncio" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Invia richiesta/i })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("layout senza overflow a 360, 768 e 1440 px", async ({ page }) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /OGGETTI TROVATI/i })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow orizzontale a ${width}px`).toBeLessThanOrEqual(1);
  }
});

test("SEO e GEO pubblici espongono solo contenuti indicizzabili", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLd).toContain("FAQPage");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await page.goto("/come-funziona");
  await expect(page.getByRole("heading", { name: /DALLA FOTO A UNA DECISIONE/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("User-Agent: OAI-SearchBot");
  expect(robots).toContain("Disallow: /app");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/come-funziona");
  expect(sitemap).not.toContain("/app/");
  expect(sitemap).not.toContain("/login");

  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("Confidence");
  expect(llms).toContain("info@voxels.it");
});
