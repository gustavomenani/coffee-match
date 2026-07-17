import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/actions/password-reset";
import { SubmitButton } from "@/components/ui/submit-button";

async function esqueciSenhaAction(formData: FormData) {
  "use server";

  const result = await requestPasswordReset(formData);
  if (!result.ok) {
    redirect(`/esqueci-senha?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/esqueci-senha?enviado=1");
}

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; error?: string }>;
}) {
  const params = await searchParams;
  const sent = params.enviado === "1";
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
          Esqueci minha senha
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Informe o e-mail da sua conta e enviaremos um link para redefinir a
          senha.
        </p>

        {sent ? (
          <p
            role="status"
            className="flash-success mt-5 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
          >
            Se o e-mail estiver cadastrado, você receberá um link para
            redefinir a senha. Confira sua caixa de entrada e o spam.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="flash-error mt-5 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        <form action={esqueciSenhaAction} className="mt-8 flex flex-col gap-4">
          {/* Honeypot anti-bot — hidden from humans */}
          <div
            aria-hidden
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
          >
            <label>
              Website
              <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <label className="block">
            <span className="label">E-mail</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              spellCheck={false}
              className="field"
            />
          </label>

          <SubmitButton pendingLabel="Enviando…">Enviar link</SubmitButton>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          Lembrou a senha?{" "}
          <Link href="/login" className="link-coffee font-semibold">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
