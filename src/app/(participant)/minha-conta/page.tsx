import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "@/lib/actions/profile";

async function profileAction(formData: FormData) {
  "use server";

  const result = await updateProfile(formData);
  if (!result.ok) {
    redirect(`/minha-conta?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/minha-conta?saved=1");
}

export default async function MinhaContaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Minha conta</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Logado como <span className="font-medium text-zinc-900">{user.email}</span>
      </p>

      {params.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      ) : null}

      {params.saved ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Perfil atualizado com sucesso.
        </p>
      ) : null}

      <form action={profileAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Nome</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={user.name}
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
            defaultValue={user.phone}
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Instagram</span>
          <input
            type="text"
            name="instagram"
            maxLength={100}
            defaultValue={user.instagram ?? ""}
            placeholder="@seuusuario"
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">URL da foto</span>
          <input
            type="url"
            name="photoUrl"
            defaultValue={user.photoUrl ?? ""}
            placeholder="https://..."
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Salvar
        </button>
      </form>
    </main>
  );
}
