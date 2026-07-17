"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { signupWithState } from "@/components/auth/auth-actions";

export function SignupForm({ next }: { next: string | null }) {
  const [state, formAction] = useActionState(signupWithState, null);

  return (
    <>
      {state?.error ? (
        <p
          role="alert"
          className="flash-error mt-5 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
            spellCheck={false}
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
            pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}"
            title="Mínimo 8 caracteres, com letras e números"
          />
          <span className="mt-1.5 block text-xs text-[var(--muted)]">
            Mínimo 8 caracteres, com letras e números.
          </span>
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
            inputMode="tel"
            placeholder="(11) 99999-9999"
            className="field"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Gênero</span>
            <select name="gender" required defaultValue="" className="field">
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
            className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] accent-[var(--coffee)]"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="link-coffee font-semibold">
              Termos
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="link-coffee font-semibold">
              Política de Privacidade
            </Link>
          </span>
        </label>

        <SubmitButton pendingLabel="Criando conta…">Criar conta</SubmitButton>
      </form>
    </>
  );
}
