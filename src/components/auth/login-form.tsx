"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginWithState } from "@/components/auth/auth-actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string | null }) {
  const [state, formAction] = useActionState(loginWithState, null);

  return (
    <>
      {state?.error ? (
        <p
          role="alert"
          className="flash-error mt-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
        >
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="mt-8 flex flex-col gap-5">
        {callbackUrl ? (
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
        ) : null}
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
            autoComplete="current-password"
            className="field"
          />
        </label>

        <p className="-mt-1 text-right">
          <Link href="/esqueci-senha" className="link-coffee text-sm">
            Esqueci minha senha
          </Link>
        </p>

        <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
      </form>
    </>
  );
}
