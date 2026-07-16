import { PrismaClient, Role, Gender, EventStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "speeddate-br" },
    update: {},
    create: {
      name: "SpeedDate BR",
      slug: "speeddate-br",
    },
  });

  const passwordHash = await bcrypt.hash("admin123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@speeddate.local" },
    update: {},
    create: {
      email: "admin@speeddate.local",
      passwordHash,
      name: "Admin",
      phone: "11999999999",
      gender: Gender.male,
      birthDate: new Date("1990-01-01"),
      role: Role.admin,
    },
  });

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

  const demoEvent = await prisma.event.upsert({
    where: { slug: "noite-demo-sp" },
    update: {
      organizationId: org.id,
      title: "Noite Demo São Paulo",
      venue: "Rooftop Paulista",
      address: "Av. Paulista, 1000 — Bela Vista",
      city: "São Paulo",
      startsAt,
      endsAt,
      capacityMen: 20,
      capacityWomen: 20,
      priceCents: 8900,
      currency: "BRL",
      status: EventStatus.published,
    },
    create: {
      organizationId: org.id,
      title: "Noite Demo São Paulo",
      slug: "noite-demo-sp",
      venue: "Rooftop Paulista",
      address: "Av. Paulista, 1000 — Bela Vista",
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

  const existingSession = await prisma.eventSession.findUnique({
    where: { eventId: demoEvent.id },
  });

  if (!existingSession) {
    await prisma.eventSession.create({
      data: { eventId: demoEvent.id },
    });
  }

  console.log("Seeded org", org.slug, "admin", admin.email);
  console.log("Seeded demo event", demoEvent.slug, demoEvent.startsAt.toISOString());
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
