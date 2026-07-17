import { PrismaClient, Role, Gender, EventStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Never seed a production database. This entrypoint is wired to
  // `prisma.seed`, so it also runs on `prisma migrate reset` — and its admin
  // upsert rewrites passwordHash and role on the UPDATE branch, which against a
  // real database would reset the live admin's password to a value committed in
  // this repo and re-grant admin even to someone who had been demoted.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the seed against a production database.");
  }

  const org = await prisma.organization.upsert({
    where: { slug: "coffee-match" },
    update: { name: "Coffee Match" },
    create: {
      name: "Coffee Match",
      slug: "coffee-match",
    },
  });

  // Migrate legacy org slug if present
  const legacy = await prisma.organization.findUnique({
    where: { slug: "speeddate-br" },
  });
  if (legacy && legacy.id !== org.id) {
    await prisma.event.updateMany({
      where: { organizationId: legacy.id },
      data: { organizationId: org.id },
    });
    await prisma.organizationMember.updateMany({
      where: { organizationId: legacy.id },
      data: { organizationId: org.id },
    });
  }

  // Cost 10 nos seeds (dados de dev) — alinhado a seed-demo/seed-e2e.
  // Overridable so a shared dev environment isn't stuck with the repo default.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@coffeematch.local" },
    // Do NOT rewrite passwordHash or role on update — re-seeding must not clobber
    // an admin who rotated their password. Only ensure the row exists.
    update: {},
    create: {
      email: "admin@coffeematch.local",
      passwordHash,
      name: "Admin Coffee Match",
      phone: "11999999999",
      gender: Gender.male,
      // Noon São Paulo — the invariant age.ts reads back (midnight UTC would be
      // read as the previous civil day).
      birthDate: new Date("1990-01-01T12:00:00-03:00"),
      role: Role.admin,
    },
  });

  // Keep old admin email working if already seeded
  const oldAdmin = await prisma.user.findUnique({
    where: { email: "admin@speeddate.local" },
  });
  if (oldAdmin) {
    await prisma.user.update({
      where: { id: oldAdmin.id },
      data: { role: Role.admin, passwordHash },
    });
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: oldAdmin.id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        userId: oldAdmin.id,
      },
    });
  }

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: admin.id,
    },
  });

  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 14);
  startsAt.setHours(20, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);

  const event = await prisma.event.upsert({
    where: { slug: "noite-demo-sp" },
    update: {
      title: "Noite Demo São Paulo",
      organizationId: org.id,
      status: EventStatus.published,
      startsAt,
      endsAt,
    },
    create: {
      organizationId: org.id,
      title: "Noite Demo São Paulo",
      slug: "noite-demo-sp",
      venue: "Café & Bar Centro",
      address: "Rua Augusta, 1000",
      city: "São Paulo",
      startsAt,
      endsAt,
      capacityMen: 20,
      capacityWomen: 20,
      priceCents: 8900,
      currency: "BRL",
      status: EventStatus.published,
    },
  });

  // Covers both branches of the upsert above (create and update).
  await prisma.eventSession.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      status: "not_started",
    },
  });

  console.log("Seeded org", org.slug, "admin", admin.email);
  console.log("Seeded demo event", event.slug, startsAt.toISOString());
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
