import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CancelSubscriptionButton,
  SubscribeButton,
} from "@/components/subscription/subscription-buttons";
import { APP_TZ } from "@/lib/datetime";

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
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: APP_TZ,
  }).format(value);
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
          className="flash-success mb-6 rounded-[var(--radius-sm)] px-4 py-3 text-sm"
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
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-5xl font-semibold leading-none tabular text-[var(--ink)]">
                R$ 10
                <span className="ml-1 text-lg font-medium text-[var(--muted)]">
                  /mês
                </span>
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Cancele quando quiser
              </p>
            </div>
            <SubscribeButton />
          </div>
        ) : (
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-5xl font-semibold leading-none tabular text-[var(--ink)]">
                R$ 10
                <span className="ml-1 text-lg font-medium text-[var(--muted)]">
                  /mês
                </span>
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Cancele quando quiser
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/cadastro?next=/assinatura"
                className="btn btn-primary w-full sm:w-auto"
              >
                Criar conta
              </Link>
              <Link
                href="/login?callbackUrl=/assinatura"
                className="btn btn-secondary w-full sm:w-auto"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        )}

        <div className="gold-rule mb-7" />

        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-5">
          {benefits.map((b) => (
            <li key={b.title} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--coffee)_14%,transparent)] text-[var(--coffee-deep)]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  {b.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  {b.description}
                </p>
              </div>
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
