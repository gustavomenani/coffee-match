import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPassword } from "@/lib/actions/password-reset";
import { SubmitButton } from "@/components/ui/submit-button";

async function redefinirSenhaAction(formData: FormData) {
  "use server";

  const result = await resetPassword(formData);
  if (!result.ok) {
    const token = String(formData.get("token") ?? "");
    redirect(
      `/redefinir-senha?token=${encodeURIComponent(token)}&error=${encodeURIComponent(result.error)}`
    );
  }
  redirect("/login?reset=1");
}

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;
  const error = params.error;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="surface-card relative overflow-hidden p-8 shadow-[var(--shadow-lift)] sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--coffee-deep),var(--coffee-hot),var(--champagne))]"
        />
        <p className="eyebrow mb-3">Conta</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Redefinir senha
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Escolha uma nova senha para a sua conta.
        </p>

        {error ? (
          <p
            role="alert"
            className="flash-error mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
          >
            {error}
          </p>
        ) : null}

        {token ? (
          <form
            action={redefinirSenhaAction}
            className="mt-8 flex flex-col gap-5"
          >
            <input type="hidden" name="token" value={token} />

            <label className="block">
              <span className="label">Nova senha</span>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                className="field"
                pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}"
                title="Mínimo 8 caracteres, com letras e números"
              />
              <span className="mt-1.5 block text-xs text-[var(--muted)]">
                Mínimo 8 caracteres, com letras e números.
              </span>
            </label>

            <label className="block">
              <span className="label">Confirmar nova senha</span>
              <input
                type="password"
                name="passwordConfirm"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                className="field"
              />
            </label>

            <SubmitButton pendingLabel="Redefinindo…">
              Redefinir senha
            </SubmitButton>
          </form>
        ) : (
          <p
            role="alert"
            className="flash-error mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
          >
            Link inválido ou expirado. Solicite um novo link abaixo.
          </p>
        )}

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          Precisa de um novo link?{" "}
          <Link href="/esqueci-senha" className="link-coffee font-semibold">
            Solicitar novamente
          </Link>
        </p>
      </div>
    </main>
  );
}
