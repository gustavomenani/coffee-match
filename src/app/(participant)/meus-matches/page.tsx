import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageShell, EmptyState } from "@/components/ui/page-shell";
import { formatDateTime as formatDate } from "@/lib/datetime";

export const dynamic = "force-dynamic";

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

  // Same gate as canViewResults (src/lib/domain/eligibility.ts), enforced in the
  // query. This page reached straight for Match rows and rendered phone numbers
  // and WhatsApp links with no check at all, so it served contacts that
  // /evento/[id]/matches correctly refuses:
  //
  //  - reopenVoting deliberately keeps matches while flipping the session back
  //    to voting_open, so results are provisional again — this page kept
  //    handing them out;
  //  - refundTicket never deletes matches, so a refunded participant was locked
  //    out of getMyMatches but still had every contact listed here.
  //
  // Contact disclosure is the one thing in this product that cannot be undone.
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      session: {
        status: "voting_closed",
        event: {
          tickets: {
            some: { userId, status: "paid", checkedInAt: { not: null } },
          },
        },
      },
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
                    <div
                      aria-hidden
                      className="h-1 bg-[linear-gradient(90deg,var(--coffee-deep),var(--coffee-hot),var(--champagne))]"
                    />
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
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--coffee-deep)]">
                          Match mútuo
                        </p>
                        <p className="font-display mt-1 text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
                          {c.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 p-5 sm:flex-row sm:flex-wrap">
                      <a
                        href={c.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary !min-h-12 sm:!min-h-11"
                      >
                        <svg
                          aria-hidden
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-4 w-4 shrink-0"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                        WhatsApp
                      </a>
                      {c.instagram ? (
                        <a
                          href={`https://instagram.com/${c.instagram.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary !min-h-12 sm:!min-h-11"
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
