import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeVoting, openVoting } from "@/lib/actions/admin-session";
import {
  CheckInList,
  type CheckInTicketRow,
} from "@/components/admin/checkin-list";

async function openVotingAction(formData: FormData) {
  "use server";
  const eventId = String(formData.get("eventId") ?? "");
  const result = await openVoting(eventId);
  if (!result.ok) {
    redirect(
      `/admin/eventos/${eventId}/noite?error=${encodeURIComponent(result.error)}`,
    );
  }
  revalidatePath(`/admin/eventos/${eventId}/noite`);
  redirect(`/admin/eventos/${eventId}/noite?ok=open`);
}

async function closeVotingAction(formData: FormData) {
  "use server";
  const eventId = String(formData.get("eventId") ?? "");
  const result = await closeVoting(eventId);
  if (!result.ok) {
    redirect(
      `/admin/eventos/${eventId}/noite?error=${encodeURIComponent(result.error)}`,
    );
  }
  revalidatePath(`/admin/eventos/${eventId}/noite`);
  redirect(`/admin/eventos/${eventId}/noite?ok=close`);
}

function sessionLabel(status: string | undefined) {
  switch (status) {
    case "voting_open":
      return "Votação aberta";
    case "voting_closed":
      return "Votação encerrada";
    case "not_started":
      return "Ainda não iniciada";
    default:
      return "Sem sessão";
  }
}

export default async function NoitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/login");
  }

  const { id: eventId } = await params;
  const query = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      session: true,
      tickets: {
        where: { status: "paid" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              gender: true,
              phone: true,
            },
          },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!event) {
    redirect("/admin/eventos");
  }

  const rows: CheckInTicketRow[] = event.tickets.map((t) => ({
    id: t.id,
    checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
    user: {
      name: t.user.name,
      email: t.user.email,
      gender: t.user.gender,
      phone: t.user.phone,
    },
  }));

  const sessionStatus = event.session?.status;
  const canOpen =
    !sessionStatus ||
    sessionStatus === "not_started" ||
    sessionStatus === "voting_closed";
  const canClose = sessionStatus === "voting_open";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Noite do evento</h1>
      <p className="mb-2 text-base font-medium text-zinc-800">{event.title}</p>
      <p className="mb-6 text-sm text-zinc-600">
        Status da sessão:{" "}
        <span className="font-semibold">{sessionLabel(sessionStatus)}</span>
        {" · "}
        Evento: <span className="font-semibold">{event.status}</span>
      </p>

      {query.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {query.error}
        </p>
      ) : null}

      {query.ok === "open" ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
          Votação aberta com sucesso.
        </p>
      ) : null}

      {query.ok === "close" ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
          Votação encerrada. Matches mútuos calculados.
        </p>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Controle da votação</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={openVotingAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              disabled={!canOpen}
              className="min-h-12 w-full rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Abrir votação
            </button>
          </form>
          <form action={closeVotingAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              disabled={!canClose}
              className="min-h-12 w-full rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Encerrar votação
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Check-in</h2>
        <CheckInList tickets={rows} />
      </section>
    </main>
  );
}
