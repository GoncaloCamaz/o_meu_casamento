// @ts-check
const { test, expect } = require("@playwright/test");

const SITE = "/";

// Horas de Portugal (verão = UTC+1)
const lisboa = (hora, dia = "2027-07-03") => new Date(`${dia}T${hora}+01:00`);

const FASES = {
  antes: { titulo: "Vamos Casar!", subtitulo: "queremos muito que celebres" },
  missa: { titulo: "Estamos a casar!", subtitulo: "estamos no altar" },
  festa: { titulo: "Já casámos!!", subtitulo: "siga para a festa" },
  depois: { titulo: "Já casámos!!", subtitulo: "Obrigado a todos" },
};

/** Abre o site com o relógio do browser fixado na data indicada. */
async function abrirEm(page, data) {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  // Relógio parado: só avança quando o teste chama clock.runFor()
  await page.clock.install({ time: data });
  await page.clock.pauseAt(data);
  await page.goto(SITE);
  return erros;
}

async function esperarFase(page, fase) {
  const { titulo, subtitulo } = FASES[fase];
  await expect(page.locator("#heroTitle")).toHaveText(titulo);
  await expect(page.locator("#heroSubtitle")).toContainText(subtitulo);
  if (fase === "antes") {
    await expect(page.locator("#countdown")).toBeVisible();
  } else {
    await expect(page.locator("#countdown")).toBeHidden();
  }
}

async function lerContagem(page) {
  return Promise.all(
    ["days", "hours", "minutes", "seconds"].map((u) =>
      page.locator(`#cd-${u}`).textContent(),
    ),
  );
}

test.describe("fase em que o site é aberto", () => {
  const casos = [
    ["meses antes", lisboa("10:00:00", "2026-11-20"), "antes"],
    ["1 segundo antes da missa", lisboa("12:59:59"), "antes"],
    ["exatamente às 13:00", lisboa("13:00:00"), "missa"],
    ["a meio da missa", lisboa("13:30:00"), "missa"],
    ["às 13:59:59", lisboa("13:59:59"), "missa"],
    ["exatamente às 14:00", lisboa("14:00:00"), "festa"],
    ["a meio da festa", lisboa("23:59:59"), "festa"],
    ["à meia-noite de 4 de julho", lisboa("00:00:00", "2027-07-04"), "depois"],
    ["um ano depois", lisboa("12:00:00", "2028-07-03"), "depois"],
  ];

  for (const [nome, data, fase] of casos) {
    test(`${nome} → ${fase}`, async ({ page }) => {
      const erros = await abrirEm(page, data);
      await esperarFase(page, fase);
      expect(erros).toEqual([]);
    });
  }
});

test("a contagem mostra o tempo certo e anda para trás", async ({ page }) => {
  // 1 dia, 2 horas, 3 minutos e 4 segundos antes das 13:00
  await abrirEm(page, lisboa("10:56:56", "2027-07-02"));
  expect(await lerContagem(page)).toEqual(["01", "02", "03", "04"]);

  await page.clock.runFor(5000);
  expect(await lerContagem(page)).toEqual(["01", "02", "02", "59"]);
});

test("com a página aberta, passa por todas as fases sozinha", async ({
  page,
}) => {
  await abrirEm(page, lisboa("12:59:57"));
  await esperarFase(page, "antes");
  expect(await lerContagem(page)).toEqual(["00", "00", "00", "03"]);

  await page.clock.runFor(4000); // 13:00:01
  await esperarFase(page, "missa");

  await page.clock.runFor(60 * 60 * 1000); // 14:00:01
  await esperarFase(page, "festa");

  await page.clock.runFor(10 * 60 * 60 * 1000); // 00:00:01 de 4 jul
  await esperarFase(page, "depois");
});

test("depois do casamento, WhatsApp e calendário continuam a funcionar", async ({
  page,
}) => {
  const erros = await abrirEm(page, lisboa("15:00:00"));

  await expect(page.locator("#whatsappGoncalo")).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/351\d{9}\?text=/,
  );
  await expect(page.locator("#whatsappMargarida")).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/351\d{9}\?text=/,
  );

  const calBtn = page.locator("#calBtn");
  await calBtn.scrollIntoViewIfNeeded();
  await calBtn.click();
  await expect(page.locator("#calDropdown")).toBeVisible();

  expect(erros).toEqual([]);
});
