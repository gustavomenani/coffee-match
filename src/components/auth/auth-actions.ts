"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { registerUser } from "@/lib/actions/profile";

export type AuthFormState = { error: string } | null;

/** Aceita apenas paths internos ("/…"), rejeitando URLs absolutas e protocol-relative ("//…"). */
function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export async function loginWithState(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeInternalPath(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl ?? "/meus-ingressos",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    // NEXT_REDIRECT (sucesso) e erros inesperados devem propagar.
    throw error;
  }
  return null;
}

export async function signupWithState(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeInternalPath(formData.get("next"));
  const result = await registerUser(formData);
  if (!result.ok) {
    return { error: result.error };
  }
  redirect(
    next
      ? `/login?registered=1&callbackUrl=${encodeURIComponent(next)}`
      : "/login?registered=1",
  );
}
