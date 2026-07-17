import { test, expect, type Page } from "@playwright/test";
import { E2E, seedE2eFixtures } from "../prisma/seed-e2e";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(
    (url) =>
      /\/(meus-ingressos|admin|eventos)/.test(url.pathname) ||
      url.pathname === "/",
    { timeout: 30_000 },
  );
  // If still on login with error, fail clearly
  if (page.url().includes("/login")) {
    throw new Error(`Login failed for ${email}`);
  }
}

test.describe.configure({ mode: "serial" });

test.describe("Coffee Match core flows", () => {
  test.beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5437/coffeematch?schema=public";
    await seedE2eFixtures();
  });

  test("forgot password always shows the generic success message", async ({
    page,
  }) => {
    await page.goto("/esqueci-senha");
    await page
      .locator('input[name="email"]')
      .fill("qualquer@e2e.coffeematch.local");
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(
      page.getByText("Se o e-mail estiver cadastrado"),
    ).toBeVisible();
  });

  test("subscription page renders the public pitch without login", async ({
    page,
  }) => {
    const response = await page.goto("/assinatura");
    expect(response?.ok()).toBe(true);
    await expect(page.getByText("R$ 10").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Assinatura Coffee Match" }),
    ).toBeVisible();
  });

  test("participant becomes supporter via dev bypass", async ({ page }) => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5437/coffeematch?schema=public";

    // Reset any previous subscription so the flow is repeatable.
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      await prisma.subscription.deleteMany({
        where: { user: { email: E2E.manEmail } },
      });
    } finally {
      await prisma.$disconnect();
    }

    await login(page, E2E.manEmail, E2E.participantPassword);
    await page.goto("/assinatura");
    await page
      .getByRole("button", { name: "Assinar por R$ 10/mês" })
      .click();
    await page.waitForURL(/\/assinatura\?ativada=1/, { timeout: 25_000 });
    await expect(page.getByText("Apoiador ativo")).toBeVisible();
  });
});
