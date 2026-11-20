// @ts-check
const { test, expect } = require("@playwright/test");

// O Playwright desliga o back-forward cache por defeito; os browsers reais
// (Safari/Chrome no telemóvel) têm-no ligado, e é aí que o bug aparece.
// O "headless shell" não suporta este cache, por isso usamos o Chromium completo.
test.use({
  channel: "chromium",
  launchOptions: { ignoreDefaultArgs: ["--disable-back-forward-cache"] },
});

test("ao voltar atrás depois de abrir o convite, o envelope volta a fechar", async ({
  page,
}) => {
  // Regista se a página foi restaurada do back-forward cache
  await page.addInitScript(() => {
    window.addEventListener("pageshow", (e) => {
      window.__restauradaDoCache = e.persisted;
    });
  });

  await page.goto("/invite/");
  const envelope = page.locator("#envelopeClip");
  const dica = page.locator("#inviteHint");
  await expect(dica).toHaveText("Toca para abrir o convite");

  await envelope.click();
  await expect(envelope).toHaveClass(/open/);
  await page.waitForURL((url) => url.pathname === "/");

  // Restaurar do cache não dispara "load", por isso não esperamos por ele
  await page.goBack({ waitUntil: "commit" });
  await expect(page).toHaveURL(/\/invite\/$/);
  await expect
    .poll(() => page.evaluate(() => window.__restauradaDoCache))
    .not.toBeUndefined();

  // Garante que testámos mesmo o cenário do cache, e não um reload normal
  expect(await page.evaluate(() => window.__restauradaDoCache)).toBe(true);

  await expect(envelope).not.toHaveClass(/open/);
  await expect(dica).toHaveText("Toca para abrir o convite");

  // E dá para abrir outra vez
  await envelope.click();
  await page.waitForURL((url) => url.pathname === "/");
});

test("o convite também abre com o teclado", async ({ page }) => {
  await page.goto("/invite/");
  await page.locator("#envelopeClip").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#envelopeClip")).toHaveClass(/open/);
  await page.waitForURL((url) => url.pathname === "/");
});
