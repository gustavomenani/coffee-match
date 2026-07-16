import Link from "next/link";
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
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href={`/admin/eventos/${eventId}`}
        className="mb-3 inline-block text-sm font-semibold text-[var(--muted)] hover:text-[var(--carmine)]"
      >
        ← Evento
      </Link>
      <p className="eyebrow mb-3">Operação da noite</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)]">
        {event.title}
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Sessão:{" "}
        <span className="font-semibold text-[var(--ink)]">
          {sessionLabel(sessionStatus)}
        </span>
        {" · "}
        Evento:{" "}
        <span className="font-semibold text-[var(--ink)]">{event.status}</span>
      </p>

      {query.error ? (
        <p className="mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {query.error}
        </p>
      ) : null}

      {query.ok === "open" ? (
        <p className="mt-5 rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Votação aberta com sucesso.
        </p>
      ) : null}

      {query.ok === "close" ? (
        <p className="mt-5 rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Votação encerrada. Matches mútuos calculados.
        </p>
      ) : null}

      <section className="surface-card mt-10 p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
          Controle da votação
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Abra quando todos tiverem feito check-in. Encerrar calcula os matches.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <form action={openVotingAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              disabled={!canOpen}
              className="btn btn-primary w-full !min-h-12 sm:w-auto"
            >
              Abrir votação
            </button>
          </form>
          <form action={closeVotingAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              disabled={!canClose}
              className="btn btn-secondary w-full !min-h-12 sm:w-auto"
            >
              Encerrar votação
            </button>
          </form>
          <Link
            href={`/admin/eventos/${eventId}/matches`}
            className="btn btn-ghost w-full !min-h-12 sm:w-auto"
          >
            Ver matches
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold text-[var(--ink)]">
          Check-in
        </h2>
        <CheckInList eventId={eventId} tickets={rows} />
      </section>
    </main>
  );
}
