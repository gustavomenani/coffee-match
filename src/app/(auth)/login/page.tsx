import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

/** Aceita apenas paths internos ("/…"), rejeitando URLs absolutas e protocol-relative ("//…"). */
function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    reset?: string;
    registered?: string;
    callbackUrl?: string;
  }>;
}) {
  const params = await searchParams;
  const passwordReset = params.reset === "1";
  const justRegistered = params.registered === "1";
  const callbackUrl = safeInternalPath(params.callbackUrl);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] shadow-[var(--shadow-lift)] lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-[linear-gradient(165deg,#1a100c_0%,#2a1a12_45%,#1a100c_100%)] p-10 text-[#f5e6d3] lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_280px_at_20%_10%,color-mix(in_srgb,var(--coffee)_28%,transparent),transparent_60%),radial-gradient(400px_240px_at_90%_80%,color-mix(in_srgb,var(--champagne)_14%,transparent),transparent_55%)]"
          />
          <div className="relative">
            <Image
              src="/logo.jpeg"
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-2 ring-[color-mix(in_srgb,var(--champagne)_40%,transparent)]"
            />
            <p className="eyebrow mt-8 !text-[var(--champagne)]">
              Conta
            </p>
            <p className="font-display mt-3 text-4xl font-medium leading-tight">
              Bem-vindo de volta ao{" "}
              <span className="text-[var(--champagne)]">Coffee Match</span>.
            </p>
          </div>
          <div className="relative">
            <div aria-hidden className="gold-rule mb-6" />
            <p className="text-sm leading-relaxed text-[color-mix(in_srgb,#f5e6d3_68%,transparent)]">
              Ingressos, votos e matches — tudo na sua conta. Uma xícara por
              vez.
            </p>
          </div>
        </div>

        <div className="bg-[var(--paper-card)] p-8 sm:p-10">
          <p className="eyebrow mb-3 lg:hidden">Conta</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Entrar
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Acesse sua conta para comprar e votar.
          </p>

          {passwordReset ? (
            <p
              role="status"
              className="flash-success mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
            >
              Senha redefinida. Faça login.
            </p>
          ) : null}

          {justRegistered ? (
            <p
              role="status"
              className="flash-success mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
            >
              Conta criada! Faça login para continuar.
            </p>
          ) : null}

          <LoginForm callbackUrl={callbackUrl} />

          <p className="mt-8 text-center text-sm text-[var(--muted)]">
            Não tem conta?{" "}
            <Link
              href={
                callbackUrl
                  ? `/cadastro?next=${encodeURIComponent(callbackUrl)}`
                  : "/cadastro"
              }
              className="link-coffee font-semibold"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
