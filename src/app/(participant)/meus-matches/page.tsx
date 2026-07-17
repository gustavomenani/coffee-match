import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageShell, EmptyState } from "@/components/ui/page-shell";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function toWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export default async function MeusMatchesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      session: {
        include: {
          event: {
            select: { id: true, title: true, startsAt: true, city: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const otherIds = Array.from(
    new Set(matches.map((m) => (m.userAId === userId ? m.userBId : m.userAId))),
  );
  const users =
    otherIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: otherIds } },
          select: {
            id: true,
            name: true,
            phone: true,
            instagram: true,
            photoUrl: true,
          },
        })
      : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  type EventGroup = {
    event: { id: string; title: string; startsAt: Date; city: string | null };
    contacts: {
      matchId: string;
      name: string;
      phone: string;
      instagram: string | null;
      photoUrl: string | null;
      whatsappUrl: string;
    }[];
  };

  const groups = new Map<string, EventGroup>();
  for (const m of matches) {
    const other = userById.get(m.userAId === userId ? m.userBId : m.userAId);
    if (!other) continue;
    const event = m.session.event;
    let group = groups.get(event.id);
    if (!group) {
      group = { event, contacts: [] };
      groups.set(event.id, group);
    }
    group.contacts.push({
      matchId: m.id,
      name: other.name,
      phone: other.phone,
      instagram: other.instagram,
      photoUrl: other.photoUrl,
      whatsappUrl: toWhatsappUrl(other.phone),
    });
  }
  const grouped = Array.from(groups.values());

  return (
    <PageShell
      eyebrow="Conexões"
      title="Meus matches"
      description="Todos os matches mútuos das suas noites, reunidos num só lugar."
    >
      {grouped.length === 0 ? (
        <EmptyState
          title="Nenhum match por enquanto"
          description="Seus matches de todas as noites aparecem aqui."
          action={
            <Link href="/eventos" className="btn btn-primary">
              Ver próximas noites
            </Link>
          }
        />
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-10">
          {grouped.map(({ event, contacts }) => (
            <section key={event.id}>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
                {event.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {formatDate(event.startsAt)}
                {event.city ? ` · ${event.city}` : ""}
              </p>

              <ul className="stagger mt-4 grid gap-4">
                {contacts.map((c) => (
                  <li key={c.matchId} className="surface-card overflow-hidden">
                    <div className="flex items-center gap-4 border-b border-[var(--line)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--carmine)_8%,var(--paper-card)),var(--paper-card))] px-6 py-5">
                      {c.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photoUrl}
                          alt={`Foto de ${c.name}`}
                          width={56}
                          height={56}
                          className="h-14 w-14 shrink-0 rounded-full border border-[var(--line)] object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--carmine)_14%,var(--paper-deep))] font-display text-xl font-semibold text-[var(--carmine)]"
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                          Match mútuo
                        </p>
                        <p className="font-display mt-1 text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
                          {c.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 p-5">
                      <a
                        href={c.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary !min-h-11"
                      >
                        WhatsApp
                      </a>
                      {c.instagram ? (
                        <a
                          href={`https://instagram.com/${c.instagram.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary !min-h-11"
                        >
                          Instagram @{c.instagram.replace(/^@/, "")}
                        </a>
                      ) : null}
                    </div>
                    <p className="px-5 pb-5 text-xs text-[var(--muted)]">
                      {c.phone}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
