import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/meus-ingressos",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=CredenciaisInválidas");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = !!params.error;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] shadow-[var(--shadow-lift)] lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-[linear-gradient(165deg,#1a100c_0%,#2a1a12_45%,#1a100c_100%)] p-10 text-[#f5e6d3] lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_280px_at_20%_10%,color-mix(in_srgb,var(--coffee)_28%,transparent),transparent_60%),radial-gradient(400px_240px_at_90%_80%,color-mix(in_srgb,var(--champagne)_14%,transparent),transparent_55%)]"
          />
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt=""
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
          <p className="relative text-sm leading-relaxed text-[color-mix(in_srgb,#f5e6d3_68%,transparent)]">
            Ingressos, votos e matches — tudo na sua conta. Uma xícara por vez.
          </p>
        </div>

        <div className="bg-[var(--paper-card)] p-8 sm:p-10">
          <p className="eyebrow mb-3 lg:hidden">Conta</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Entrar
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Acesse sua conta para comprar e votar.
          </p>

          {hasError ? (
            <p className="mt-5 rounded-[var(--radius-sm)] flash-error rounded-[var(--radius-sm)] px-3 py-2 text-sm">
              E-mail ou senha inválidos.
            </p>
          ) : null}

          <form action={loginAction} className="mt-8 flex flex-col gap-4">
            <label className="block">
              <span className="label">E-mail</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Senha</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                minLength={1}
                className="field"
              />
            </label>

            <button type="submit" className="btn btn-primary mt-2 w-full">
              Entrar
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[var(--muted)]">
            Não tem conta?{" "}
            <Link href="/cadastro" className="link-coffee font-semibold">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
