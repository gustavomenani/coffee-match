import Link from "next/link";
import { getWhoLikedMe } from "@/lib/actions/results";

export default async function CurtidasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const result = await getWhoLikedMe(eventId);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Quem te curtiu</h1>
        <Link
          href={`/evento/${eventId}/matches`}
          className="text-sm font-medium text-rose-600 underline-offset-2 hover:underline"
        >
          Ver matches
        </Link>
      </div>

      <p className="mb-4 text-sm text-zinc-600">
        Contato (WhatsApp/Instagram) só é liberado em match mútuo.
      </p>

      {!result.ok ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {result.error}
        </div>
      ) : result.likes.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          Ninguém te curtiu nesta noite — ou a votação ainda não encerrou.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {result.likes.map((like) => (
            <li key={like.userId} className="px-4 py-3 text-base font-medium text-zinc-900">
              {like.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
