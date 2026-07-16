import { test, expect, type Page } from "@playwright/test";
import { E2E, seedE2eFixtures, type E2eFixture } from "../prisma/seed-e2e";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(meus-ingressos|admin|eventos)/, { timeout: 20_000 });
}

async function logout(page: Page) {
  const sair = page.getByRole("button", { name: "Sair" });
  if (await sair.isVisible().catch(() => false)) {
    await sair.click();
    await page.waitForURL("/", { timeout: 15_000 });
  }
}

test.describe.configure({ mode: "serial" });

test.describe("SpeedDate night smoke", () => {
  let fixture: E2eFixture;

  test.beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5437/speeddate?schema=public";
    fixture = await seedE2eFixtures();
  });

  test("admin check-in, voting, mutual match shows partner phone", async ({
    page,
  }) => {
    // --- Admin: check-in both + open voting ---
    await login(page, E2E.adminEmail, E2E.adminPassword);
    await page.goto(`/admin/eventos/${fixture.eventId}/noite`);
    await expect(page.getByRole("heading", { name: "Noite do evento" })).toBeVisible();
    await expect(page.getByText(fixture.manName)).toBeVisible();
    await expect(page.getByText(fixture.womanName)).toBeVisible();

    const checkInButtons = page.getByRole("button", { name: "Fazer check-in" });
    await expect(checkInButtons).toHaveCount(2);
    await checkInButtons.nth(0).click();
    await expect(page.getByText("Check-in feito").first()).toBeVisible();
    await checkInButtons.nth(0).click();
    await expect(page.getByText("Check-in feito")).toHaveCount(2);

    await page.getByRole("button", { name: "Abrir votação" }).click();
    await expect(page.getByText("Votação aberta com sucesso.")).toBeVisible();
    await expect(page.getByText("Status da sessão:")).toContainText("Votação aberta");
    await logout(page);

    // --- Man votes yes on woman ---
    await login(page, E2E.manEmail, E2E.participantPassword);
    await page.goto(`/evento/${fixture.eventId}/votar`);
    await expect(page.getByRole("heading", { name: "Votação" })).toBeVisible();
    await expect(page.getByText(fixture.womanName)).toBeVisible();
    await page.getByRole("button", { name: "Sim" }).click();
    await expect(page.getByText("Seu voto: Sim")).toBeVisible();
    await logout(page);

    // --- Woman votes yes on man ---
    await login(page, E2E.womanEmail, E2E.participantPassword);
    await page.goto(`/evento/${fixture.eventId}/votar`);
    await expect(page.getByText(fixture.manName)).toBeVisible();
    await page.getByRole("button", { name: "Sim" }).click();
    await expect(page.getByText("Seu voto: Sim")).toBeVisible();
    await logout(page);

    // --- Admin closes voting (computes matches) ---
    await login(page, E2E.adminEmail, E2E.adminPassword);
    await page.goto(`/admin/eventos/${fixture.eventId}/noite`);
    await page.getByRole("button", { name: "Encerrar votação" }).click();
    await expect(
      page.getByText("Votação encerrada. Matches mútuos calculados."),
    ).toBeVisible();
    await logout(page);

    // --- Man sees match with woman's phone ---
    await login(page, E2E.manEmail, E2E.participantPassword);
    await page.goto(`/evento/${fixture.eventId}/matches`);
    await expect(page.getByRole("heading", { name: "Seus matches" })).toBeVisible();
    await expect(page.getByText(fixture.womanName)).toBeVisible();
    await expect(page.getByText(fixture.womanPhone)).toBeVisible();
    await expect(page.getByRole("link", { name: "WhatsApp" })).toBeVisible();
  });

  test("participant can buy ticket with Mercado Pago bypass", async ({ page }) => {
    // Fresh published event without tickets for a dedicated buyer user
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5437/speeddate?schema=public";

    const { PrismaClient, Gender, Role, EventStatus } = await import(
      "@prisma/client"
    );
    const bcrypt = (await import("bcryptjs")).default;
    const prisma = new PrismaClient();

    try {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { slug: "speeddate-br" },
      });
      const passwordHash = await bcrypt.hash("buy123456", 10);
      const buyer = await prisma.user.upsert({
        where: { email: "buyer@e2e.speeddate.local" },
        update: {
          passwordHash,
          phone: "11955556666",
          gender: Gender.male,
          role: Role.participant,
          name: "E2E Buyer",
        },
        create: {
          email: "buyer@e2e.speeddate.local",
          passwordHash,
          name: "E2E Buyer",
          phone: "11955556666",
          gender: Gender.male,
          birthDate: new Date("1994-01-01"),
          role: Role.participant,
        },
      });

      const slug = "e2e-buy-ticket";
      const existing = await prisma.event.findUnique({ where: { slug } });
      if (existing) {
        await prisma.ticket.deleteMany({ where: { eventId: existing.id } });
      }
      const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const event = await prisma.event.upsert({
        where: { slug },
        update: {
          status: EventStatus.published,
          capacityMen: 10,
          capacityWomen: 10,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
        },
        create: {
          organizationId: org.id,
          title: "E2E Buy Ticket",
          slug,
          venue: "Bar Buy",
          address: "Rua Buy 1",
          city: "São Paulo",
          startsAt,
          endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
          capacityMen: 10,
          capacityWomen: 10,
          priceCents: 3000,
          status: EventStatus.published,
        },
      });

      await prisma.ticket.deleteMany({
        where: { eventId: event.id, userId: buyer.id },
      });

      await login(page, "buyer@e2e.speeddate.local", "buy123456");
      await page.goto(`/eventos/${slug}`);
      await page.getByRole("button", { name: "Comprar ingresso" }).click();
      await page.waitForURL(/\/pagamento\/sucesso/, { timeout: 20_000 });
      await expect(
        page.getByText("Pagamento confirmado! Seu ingresso está garantido."),
      ).toBeVisible();
    } finally {
      await prisma.$disconnect();
    }
  });
});
