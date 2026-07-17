import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

/** Aceita apenas paths internos ("/…"), rejeitando URLs absolutas e protocol-relative ("//…"). */
function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeInternalPath(params.next);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="surface-card relative overflow-hidden p-8 shadow-[var(--shadow-lift)] sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--coffee-deep),var(--coffee-hot),var(--champagne))]"
        />
        <p className="eyebrow mb-3">Conta</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Criar conta
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Perfil leve, 18+. Você usa isso para comprar ingresso e votar na noite.
        </p>

        <SignupForm next={next} />

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          Já tem conta?{" "}
          <Link
            href={
              next
                ? `/login?callbackUrl=${encodeURIComponent(next)}`
                : "/login"
            }
            className="link-coffee font-semibold"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
