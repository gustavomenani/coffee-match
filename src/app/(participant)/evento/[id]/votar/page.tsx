import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBallot } from "@/lib/actions/voting";
import { BallotList } from "@/components/voting/ballot-list";

export default async function VotarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id: eventId } = await params;
  const ballot = await getBallot(eventId);

  if (!ballot.ok) {
    const phoneHint = ballot.code === "phone";
    const votingClosed =
      ballot.code === "session" && ballot.error.includes("encerrada");
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-lg">
          <p className="eyebrow mb-3">Urna digital</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            Votação
          </h1>
          <div className="surface-card mt-8 border-[color-mix(in_srgb,var(--champagne)_40%,var(--line))] bg-[color-mix(in_srgb,var(--champagne)_12%,white)] px-5 py-5 text-base text-[var(--ink-soft)]">
            <p className="leading-relaxed">{ballot.error}</p>
            {phoneHint ? (
              <Link href="/minha-conta" className="btn btn-primary mt-5">
                Ir para Minha conta
              </Link>
            ) : null}
            {votingClosed ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/evento/${eventId}/matches`}
                  className="btn btn-primary"
                >
                  Ver meus matches
                </Link>
                <Link
                  href={`/evento/${eventId}/curtidas`}
                  className="btn btn-secondary"
                >
                  Quem curtiu você
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="eyebrow mb-3">Urna digital</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Votação
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">
          {ballot.data.eventTitle}
        </p>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          Marque Sim ou Não para cada pessoa. Você pode mudar o voto enquanto a
          votação estiver aberta.
        </p>
        <div className="mt-8">
          <BallotList
            eventId={eventId}
            candidates={ballot.data.candidates}
            initialVotes={ballot.data.votes}
          />
        </div>
      </div>
    </main>
  );
}
