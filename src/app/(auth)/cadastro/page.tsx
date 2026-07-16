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
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Cadastro</h1>
      <p className="mb-8 text-sm text-zinc-600">
        Crie sua conta para participar dos eventos. É necessário ter 18 anos ou
        mais.
      </p>

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form action={cadastroAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Nome</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

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
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Telefone</span>
          <input
            type="tel"
            name="phone"
            required
            minLength={10}
            maxLength={20}
            autoComplete="tel"
            placeholder="11999999999"
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Gênero</span>
          <select
            name="gender"
            required
            defaultValue=""
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Data de nascimento</span>
          <input
            type="date"
            name="birthDate"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="acceptTerms"
            value="1"
            required
            className="mt-1 h-4 w-4 rounded border-zinc-300"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="font-medium text-zinc-900 underline">
              Termos
            </Link>{" "}
            e a{" "}
            <Link
              href="/privacidade"
              className="font-medium text-zinc-900 underline"
            >
              Política de Privacidade
            </Link>
          </span>
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Criar conta
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
