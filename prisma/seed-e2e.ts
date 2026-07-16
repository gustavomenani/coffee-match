import {
  PrismaClient,
  Role,
  Gender,
  EventStatus,
  TicketStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const E2E = {
  adminEmail: "admin@speeddate.local",
  adminPassword: "admin123456",
  manEmail: "man@e2e.speeddate.local",
  womanEmail: "woman@e2e.speeddate.local",
  participantPassword: "e2e123456",
  eventSlug: "e2e-smoke-night",
  manPhone: "11911112222",
  womanPhone: "11933334444",
  manName: "E2E Homem",
  womanName: "E2E Mulher",
} as const;

export type E2eFixture = {
  eventId: string;
  eventSlug: string;
  manId: string;
  womanId: string;
  manPhone: string;
  womanPhone: string;
  manName: string;
  womanName: string;
};

/** Reset and create fixtures for the night-flow smoke test. */
export async function seedE2eFixtures(): Promise<E2eFixture> {
  const org = await prisma.organization.upsert({
    where: { slug: "speeddate-br" },
    update: {},
    create: {
      name: "SpeedDate BR",
      slug: "speeddate-br",
    },
  });

  const adminHash = await bcrypt.hash(E2E.adminPassword, 10);
  const participantHash = await bcrypt.hash(E2E.participantPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: E2E.adminEmail },
    update: {
      passwordHash: adminHash,
      role: Role.admin,
      phone: "11999999999",
    },
    create: {
      email: E2E.adminEmail,
      passwordHash: adminHash,
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

  const man = await prisma.user.upsert({
    where: { email: E2E.manEmail },
    update: {
      passwordHash: participantHash,
      name: E2E.manName,
      phone: E2E.manPhone,
      gender: Gender.male,
      role: Role.participant,
      birthDate: new Date("1995-06-15"),
    },
    create: {
      email: E2E.manEmail,
      passwordHash: participantHash,
      name: E2E.manName,
      phone: E2E.manPhone,
      gender: Gender.male,
      birthDate: new Date("1995-06-15"),
      role: Role.participant,
    },
  });

  const woman = await prisma.user.upsert({
    where: { email: E2E.womanEmail },
    update: {
      passwordHash: participantHash,
      name: E2E.womanName,
      phone: E2E.womanPhone,
      gender: Gender.female,
      role: Role.participant,
      birthDate: new Date("1996-03-20"),
    },
    create: {
      email: E2E.womanEmail,
      passwordHash: participantHash,
      name: E2E.womanName,
      phone: E2E.womanPhone,
      gender: Gender.female,
      birthDate: new Date("1996-03-20"),
      role: Role.participant,
    },
  });

  const existingEvent = await prisma.event.findUnique({
    where: { slug: E2E.eventSlug },
    include: { session: true },
  });

  if (existingEvent?.session) {
    await prisma.match.deleteMany({ where: { sessionId: existingEvent.session.id } });
    await prisma.vote.deleteMany({ where: { sessionId: existingEvent.session.id } });
    await prisma.eventSession.delete({ where: { id: existingEvent.session.id } });
  }

  if (existingEvent) {
    await prisma.ticket.deleteMany({ where: { eventId: existingEvent.id } });
  }

  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);

  const event = await prisma.event.upsert({
    where: { slug: E2E.eventSlug },
    update: {
      organizationId: org.id,
      title: "E2E Smoke Night",
      venue: "Bar E2E",
      address: "Rua Teste 100",
      city: "São Paulo",
      startsAt,
      endsAt,
      capacityMen: 20,
      capacityWomen: 20,
      priceCents: 5000,
      currency: "BRL",
      status: EventStatus.published,
    },
    create: {
      organizationId: org.id,
      title: "E2E Smoke Night",
      slug: E2E.eventSlug,
      venue: "Bar E2E",
      address: "Rua Teste 100",
      city: "São Paulo",
      startsAt,
      endsAt,
      capacityMen: 20,
      capacityWomen: 20,
      priceCents: 5000,
      currency: "BRL",
      status: EventStatus.published,
    },
  });

  // Paid tickets via bypass path equivalent — skip checkout flakiness for night flow.
  await prisma.ticket.createMany({
    data: [
      {
        eventId: event.id,
        userId: man.id,
        status: TicketStatus.paid,
      },
      {
        eventId: event.id,
        userId: woman.id,
        status: TicketStatus.paid,
      },
    ],
  });

  return {
    eventId: event.id,
    eventSlug: event.slug,
    manId: man.id,
    womanId: woman.id,
    manPhone: E2E.manPhone,
    womanPhone: E2E.womanPhone,
    manName: E2E.manName,
    womanName: E2E.womanName,
  };
}

async function main() {
  const fixture = await seedE2eFixtures();
  console.log(JSON.stringify(fixture, null, 2));
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").includes("seed-e2e");
if (isDirectRun) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
