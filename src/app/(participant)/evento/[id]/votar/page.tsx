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
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-12">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Votação</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-base text-amber-950">
          <p>{ballot.error}</p>
          {phoneHint ? (
            <Link
              href="/minha-conta"
              className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-zinc-900 px-5 py-3 text-base font-semibold text-white"
            >
              Ir para Minha conta
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Votação</h1>
      <p className="mb-6 text-sm text-zinc-600">{ballot.data.eventTitle}</p>
      <p className="mb-6 text-base text-zinc-700">
        Marque Sim ou Não para cada pessoa. Você pode mudar o voto enquanto a
        votação estiver aberta.
      </p>
      <BallotList
        eventId={eventId}
        candidates={ballot.data.candidates}
        initialVotes={ballot.data.votes}
      />
    </main>
  );
}
