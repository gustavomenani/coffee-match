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
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] shadow-[var(--shadow-soft)] lg:grid-cols-2">
        <div className="hidden bg-[linear-gradient(165deg,#1a100c_0%,#2a1a12_50%,#120c09_100%)] p-10 text-[#f5e6d3] lg:flex lg:flex-col lg:justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt=""
              className="h-20 w-20 rounded-full object-cover ring-2 ring-[color-mix(in_srgb,var(--champagne)_35%,transparent)]"
            />
            <p className="font-display mt-6 text-4xl font-medium leading-tight">
              Bem-vindo de volta ao{" "}
              <span className="text-[var(--champagne)]">Coffee Match</span>.
            </p>
          </div>
          <p className="text-sm leading-relaxed text-[color-mix(in_srgb,#f5e6d3_65%,transparent)]">
            Ingressos, votos e matches — tudo na sua conta. Uma xícara por vez.
          </p>
        </div>

        <div className="bg-[var(--paper-card)] p-8 sm:p-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Entrar
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Acesse sua conta para comprar e votar.
          </p>

          {hasError ? (
            <p className="mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
            <Link
              href="/cadastro"
              className="font-semibold text-[var(--carmine)] underline-offset-2 hover:underline"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
