import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDataUrl } from "@/lib/qr";
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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const votingUrl = `${appUrl}/evento/${eventId}/votar`;
  const votingQr = await toDataUrl(votingUrl);
  const checkedInCount = rows.filter((r) => r.checkedInAt).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
            Pagos
          </p>
          <p className="font-display mt-2 text-3xl font-semibold tabular text-[var(--ink)]">
            {rows.length}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
            Check-in
          </p>
          <p className="font-display mt-2 text-3xl font-semibold tabular text-[var(--ink)]">
            {checkedInCount}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
            Faltam
          </p>
          <p className="font-display mt-2 text-3xl font-semibold tabular text-[var(--ink)]">
            {Math.max(0, rows.length - checkedInCount)}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
            Controle da votação
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Abra quando todos tiverem feito check-in. Encerrar calcula os matches.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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

        <section className="surface-card flex flex-col items-center p-5 text-center sm:p-6">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
            QR da votação
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Mostre na tela ou imprima para as mesas.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={votingQr}
            alt="QR code da votação"
            className="mt-4 h-48 w-48 rounded-[var(--radius-sm)] bg-white p-2 outline outline-1 outline-[var(--line)]"
          />
          <p className="mt-3 break-all text-xs text-[var(--muted)]">{votingUrl}</p>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold text-[var(--ink)]">
          Check-in
        </h2>
        <CheckInList eventId={eventId} tickets={rows} />
      </section>
    </main>
  );
}
