import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CancelSubscriptionButton,
  SubscribeButton,
} from "@/components/subscription/subscription-buttons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assinatura Apoiador",
  description:
    "Assine o Coffee Match por R$ 10/mês: selo de apoiador e acesso antecipado às vagas das noites.",
};

const benefits = [
  {
    title: "Selo de apoiador",
    description:
      "Um selo ☕ ao lado do seu nome na cédula de votação — quem apoia a comunidade, aparece.",
  },
  {
    title: "Prioridade nas vagas",
    description:
      "Noites concorridas abrem primeiro para assinantes. Você compra antes de todo mundo.",
  },
  {
    title: "Apoie as noites",
    description:
      "Sua assinatura ajuda a manter eventos menores viáveis e a melhorar cada edição.",
  },
] as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(value);
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ ativada?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const query = await searchParams;

  const subscription = userId
    ? await prisma.subscription.findUnique({
        where: { userId },
      })
    : null;
  const isActive = subscription?.status === "active";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="eyebrow mb-3">Apoiador</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Assinatura Coffee Match
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          R$ 10 por mês. Cancele quando quiser.
        </p>
      </div>

      {query.ativada === "1" && isActive ? (
        <p
          role="status"
          className="flash-success mb-6 rounded-[var(--radius-sm)] px-3 py-3 text-sm"
        >
          Assinatura ativada. Bem-vindo(a) ao clube dos apoiadores ☕
        </p>
      ) : null}

      <div className="surface-card relative overflow-hidden p-8 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--coffee-deep),var(--coffee-hot),var(--champagne))]"
        />

        {isActive ? (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="badge badge-18">☕ Apoiador ativo</span>
              {subscription?.activatedAt ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Assinante desde {formatDate(subscription.activatedAt)}
                </p>
              ) : null}
            </div>
            <CancelSubscriptionButton />
          </div>
        ) : userId ? (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <p className="font-display text-4xl font-semibold tabular text-[var(--ink)]">
              R$ 10
              <span className="text-lg text-[var(--muted)]">/mês</span>
            </p>
            <SubscribeButton />
          </div>
        ) : (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <p className="font-display text-4xl font-semibold tabular text-[var(--ink)]">
              R$ 10
              <span className="text-lg text-[var(--muted)]">/mês</span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/cadastro?next=/assinatura" className="btn btn-primary">
                Criar conta
              </Link>
              <Link
                href="/login?callbackUrl=/assinatura"
                className="btn btn-secondary"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        )}

        <div className="gold-rule mb-7" />

        <ul className="grid gap-5 sm:grid-cols-3">
          {benefits.map((b) => (
            <li key={b.title}>
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                {b.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                {b.description}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-xs leading-relaxed text-[var(--muted)]">
          Pagamento recorrente via Mercado Pago. O cancelamento interrompe as
          próximas cobranças; benefícios valem enquanto a assinatura estiver
          ativa.
        </p>
      </div>
    </main>
  );
}
