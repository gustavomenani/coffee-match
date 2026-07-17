import {
  PrismaClient,
  Gender,
  EventStatus,
  TicketStatus,
  Interest,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { INTERESTS } from "../src/lib/domain/interests";

const prisma = new PrismaClient();

/**
 * Demo night: 8 men + 8 women, paid + checked in, voting OPEN.
 * Everyone logs in with the same password. Some votes are pre-cast so
 * closing the voting as admin instantly produces matches.
 */
const DEMO_PASSWORD = "demo123456";
const EVENT_SLUG = "noite-demo-votacao";

const MEN = [
  "Rafael Almeida",
  "Bruno Costa",
  "Diego Santos",
  "Felipe Rocha",
  "Gustavo Lima",
  "Henrique Souza",
  "Lucas Pereira",
  "Thiago Oliveira",
];

const WOMEN = [
  "Ana Martins",
  "Beatriz Ferreira",
  "Camila Ribeiro",
  "Daniela Castro",
  "Fernanda Dias",
  "Juliana Moraes",
  "Larissa Nunes",
  "Mariana Teixeira",
];

const MEN_BIOS = [
  "Barista de fim de semana e colecionador de vinis empoeirados.",
  "Engenheiro de dia, cozinheiro de massas à noite. Time do espresso duplo.",
  "Corro maratonas e fujo de conversa fiada. Café sem açúcar, por favor.",
  "Fotógrafo de rua. Acho que todo mundo tem uma boa história — me conta a sua?",
  "Professor de história que faz o melhor pão de queijo de São Paulo (juro).",
  "Viciado em escalada e em descobrir cafeterias escondidas pela cidade.",
  "Músico nas horas vagas. Prometo não falar só de jazz. Talvez.",
  "Cinéfilo assumido: me convença de que filme dublado é aceitável.",
];

const WOMEN_BIOS = [
  "Viciada em café coado e trilhas no fim de semana.",
  "Arquiteta apaixonada por feiras de rua, plantas e um bom cappuccino.",
  "Leio três livros ao mesmo tempo e nunca termino nenhum. Chá também vale?",
  "Publicitária, dona de dois gatos e de opiniões fortes sobre brigadeiro.",
  "Bióloga que ama praia fora de temporada e conversa que vira madrugada.",
  "Dançarina de forró. Se pisar no meu pé, pelo menos me paga um café.",
  "Chef confeiteira: julgo os cafés pela sobremesa da vitrine.",
  "Jornalista curiosa por natureza. Pergunto muito — vem preparado(a).",
];

// Coherent with each bio above; values must be exact members of INTERESTS.
type InterestTag = (typeof INTERESTS)[number];

const MEN_INTERESTS: InterestTag[][] = [
  ["Café", "Música ao vivo"], // barista + vinis
  ["Café", "Gastronomia", "Vinho"], // cozinheiro de massas, espresso duplo
  ["Corrida", "Academia", "Café"], // maratonista
  ["Fotografia", "Viagens", "Café"], // fotógrafo de rua
  ["Livros", "Gastronomia", "Café"], // professor de história + pão de queijo
  ["Trilhas", "Café", "Viagens"], // escalada + cafeterias escondidas
  ["Música ao vivo", "Vinho"], // músico de jazz
  ["Cinema", "Séries", "Jogos"], // cinéfilo assumido
];

const WOMEN_INTERESTS: InterestTag[][] = [
  ["Café", "Trilhas"], // café coado + trilhas
  ["Café", "Gastronomia", "Viagens"], // feiras de rua + cappuccino
  ["Livros", "Séries"], // lê três livros ao mesmo tempo
  ["Pets", "Gastronomia", "Séries"], // dois gatos + brigadeiro
  ["Praia", "Trilhas", "Viagens"], // bióloga, praia fora de temporada
  ["Dança", "Música ao vivo", "Café"], // dançarina de forró
  ["Gastronomia", "Café", "Vinho"], // chef confeiteira
  ["Livros", "Viagens", "Fotografia"], // jornalista curiosa
];

function emailFor(name: string) {
  const first = name.split(" ")[0].toLowerCase();
  return `${first}@demo.coffeematch.local`;
}

async function upsertParticipant(
  name: string,
  gender: Gender,
  index: number,
  passwordHash: string,
  bio: string,
  interests: string[]
) {
  const email = emailFor(name);
  const phone = `119${gender === Gender.male ? "8" : "7"}${String(
    10000000 + index * 111111
  ).slice(0, 8)}`;
  const birthYear = 1988 + ((index * 3) % 14);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      gender,
      phone,
      bio,
      interests,
      role: "participant",
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email,
      passwordHash,
      name,
      phone,
      gender,
      bio,
      interests,
      birthDate: new Date(`${birthYear}-05-1${index % 9}`),
      instagram: `${name.split(" ")[0].toLowerCase()}.demo`,
    },
  });
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "coffee-match" },
    update: {},
    create: { name: "Coffee Match", slug: "coffee-match" },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const men = [];
  for (const [i, name] of MEN.entries()) {
    men.push(
      await upsertParticipant(
        name,
        Gender.male,
        i,
        passwordHash,
        MEN_BIOS[i],
        MEN_INTERESTS[i]
      )
    );
  }
  const women = [];
  for (const [i, name] of WOMEN.entries()) {
    women.push(
      await upsertParticipant(
        name,
        Gender.female,
        i,
        passwordHash,
        WOMEN_BIOS[i],
        WOMEN_INTERESTS[i]
      )
    );
  }

  // Two demo supporters (badge + early access): Rafael and Ana.
  for (const supporter of [men[0], women[0]]) {
    await prisma.subscription.upsert({
      where: { userId: supporter.id },
      update: { status: "active", activatedAt: new Date(), cancelledAt: null },
      create: {
        userId: supporter.id,
        status: "active",
        activatedAt: new Date(),
      },
    });
  }

  // Reset the demo event (tickets/votes/matches) so re-running is clean.
  const existing = await prisma.event.findUnique({
    where: { slug: EVENT_SLUG },
    include: { session: true },
  });
  if (existing?.session) {
    await prisma.match.deleteMany({ where: { sessionId: existing.session.id } });
    await prisma.vote.deleteMany({ where: { sessionId: existing.session.id } });
  }
  if (existing) {
    await prisma.ticket.deleteMany({ where: { eventId: existing.id } });
  }

  // "Tonight": started 1h ago, ends in 2h — live, voting open.
  const startsAt = new Date(Date.now() - 60 * 60 * 1000);
  const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const event = await prisma.event.upsert({
    where: { slug: EVENT_SLUG },
    update: {
      organizationId: org.id,
      title: "Noite Demo — Votação Aberta",
      venue: "Café Aurora",
      address: "Rua Harmonia, 123",
      city: "São Paulo",
      startsAt,
      endsAt,
      capacityMen: 10,
      capacityWomen: 10,
      priceCents: 8900,
      status: EventStatus.live,
    },
    create: {
      organizationId: org.id,
      title: "Noite Demo — Votação Aberta",
      slug: EVENT_SLUG,
      venue: "Café Aurora",
      address: "Rua Harmonia, 123",
      city: "São Paulo",
      startsAt,
      endsAt,
      capacityMen: 10,
      capacityWomen: 10,
      priceCents: 8900,
      currency: "BRL",
      status: EventStatus.live,
    },
  });

  const session = await prisma.eventSession.upsert({
    where: { eventId: event.id },
    update: { status: "voting_open", votingOpensAt: new Date(), votingClosesAt: null },
    create: {
      eventId: event.id,
      status: "voting_open",
      votingOpensAt: new Date(),
    },
  });

  // Everyone paid and checked in.
  const checkedInAt = new Date(Date.now() - 45 * 60 * 1000);
  await prisma.ticket.createMany({
    data: [...men, ...women].map((u) => ({
      eventId: event.id,
      userId: u.id,
      status: TicketStatus.paid,
      checkedInAt,
    })),
  });

  // Pre-cast votes: pairs 0-3 are mutual YES (guaranteed matches on close);
  // women 4-5 said yes to man 0 (one-sided likes for "quem curtiu").
  const votes: { fromUserId: string; toUserId: string; interest: Interest }[] = [];
  for (let i = 0; i < 4; i++) {
    votes.push({ fromUserId: men[i].id, toUserId: women[i].id, interest: Interest.yes });
    votes.push({ fromUserId: women[i].id, toUserId: men[i].id, interest: Interest.yes });
  }
  votes.push({ fromUserId: women[4].id, toUserId: men[0].id, interest: Interest.yes });
  votes.push({ fromUserId: women[5].id, toUserId: men[0].id, interest: Interest.yes });
  votes.push({ fromUserId: men[5].id, toUserId: women[6].id, interest: Interest.no });

  await prisma.vote.createMany({
    data: votes.map((v) => ({ ...v, sessionId: session.id })),
  });

  console.log("\n=== Noite demo pronta ===");
  console.log(`Evento: ${event.title} (/eventos/${event.slug})`);
  console.log(`Votação: ABERTA — /evento/${event.id}/votar`);
  console.log(`\nSenha de todos os participantes: ${DEMO_PASSWORD}`);
  console.log("\nHomens:");
  for (const m of men) console.log(`  ${m.name.padEnd(20)} ${m.email}`);
  console.log("Mulheres:");
  for (const w of women) console.log(`  ${w.name.padEnd(20)} ${w.email}`);
  console.log(
    "\nDica: entre como gustavo@demo.coffeematch.local (sem votos) para votar do zero;"
  );
  console.log(
    "como admin (admin@coffeematch.local / admin123456) encerre a votação em /admin para gerar 4 matches."
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
