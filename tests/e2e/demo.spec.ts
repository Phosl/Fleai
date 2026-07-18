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

test("prenotazione anonima demo", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/s/officina-ritrovata/sedia-cesca-vintage");
  await page.getByLabel("Nome").fill("Ada Rossi");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Messaggio").fill("Ciao, l’oggetto è ancora disponibile?");
  await page.getByLabel(/Acconsento/).check();
  const validity = await page.locator("form.inquiry-form").evaluate((form) => ({
    valid: (form as HTMLFormElement).checkValidity(),
    invalid: [...form.querySelectorAll(":invalid")].map((element) => (element as HTMLInputElement).name),
  }));
  expect(validity).toEqual({ valid: true, invalid: [] });
  const submit = page.getByRole("button", { name: /Invia richiesta/i });
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.waitForTimeout(1_000);
  expect(pageErrors).toEqual([]);
  await expect(page.getByRole("heading", { name: "Richiesta inviata" })).toBeVisible({ timeout: 10_000 });
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
