import Link from "next/link";
import { redirect } from "next/navigation";
import { registerUser } from "@/lib/actions/profile";

async function cadastroAction(formData: FormData) {
  "use server";

  const result = await registerUser(formData);
  if (!result.ok) {
    redirect(`/cadastro?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/login?registered=1");
}

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="surface-card p-8 sm:p-10">
        <p className="eyebrow mb-3">Conta</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Criar conta
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Perfil leve, 18+. Você usa isso para comprar ingresso e votar na noite.
        </p>

        {error ? (
          <p className="mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={cadastroAction} className="mt-8 flex flex-col gap-4">
          <label className="block">
            <span className="label">Nome</span>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              className="field"
            />
          </label>

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
              minLength={8}
              maxLength={100}
              autoComplete="new-password"
              className="field"
            />
          </label>

          <label className="block">
            <span className="label">WhatsApp</span>
            <input
              type="tel"
              name="phone"
              required
              minLength={10}
              maxLength={20}
              autoComplete="tel"
              placeholder="11999999999"
              className="field"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Gênero</span>
              <select
                name="gender"
                required
                defaultValue=""
                className="field"
              >
                <option value="" disabled>
                  Selecione
                </option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </label>

            <label className="block">
              <span className="label">Nascimento</span>
              <input type="date" name="birthDate" required className="field" />
            </label>
          </div>

          <label className="flex items-start gap-3 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              name="acceptTerms"
              value="1"
              required
              className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] accent-[var(--carmine)]"
            />
            <span>
              Li e aceito os{" "}
              <Link
                href="/termos"
                className="font-semibold text-[var(--carmine)] underline-offset-2 hover:underline"
              >
                Termos
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                className="font-semibold text-[var(--carmine)] underline-offset-2 hover:underline"
              >
                Política de Privacidade
              </Link>
            </span>
          </label>

          <button type="submit" className="btn btn-primary mt-2 w-full">
            Criar conta
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--carmine)] underline-offset-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
