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
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Entrar</h1>
      <p className="mb-8 text-sm text-zinc-600">
        Acesse sua conta SpeedDate BR.
      </p>

      {hasError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          E-mail ou senha inválidos.
        </p>
      ) : null}

      <form action={loginAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">E-mail</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Senha</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            minLength={1}
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-zinc-900 underline">
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
