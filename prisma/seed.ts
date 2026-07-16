import { PrismaClient, Role, Gender, EventStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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

  const passwordHash = await bcrypt.hash("admin123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@coffeematch.local" },
    update: {
      name: "Admin Coffee Match",
      passwordHash,
      role: Role.admin,
    },
    create: {
      email: "admin@coffeematch.local",
      passwordHash,
      name: "Admin Coffee Match",
      phone: "11999999999",
      gender: Gender.male,
      birthDate: new Date("1990-01-01"),
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
      session: { create: { status: "not_started" } },
    },
  });

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
