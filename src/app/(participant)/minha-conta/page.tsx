import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "@/lib/actions/profile";
import { PhotoField } from "@/components/profile/photo-field";

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
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl">
        <p className="eyebrow mb-3">Perfil</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Minha conta
        </h1>
        <p className="mt-3 text-base text-[var(--muted)]">
          Logado como{" "}
          <span className="font-medium text-[var(--ink)]">{user.email}</span>
        </p>

        <div className="surface-card mt-8 p-6 sm:p-8">
          {params.error ? (
            <p className="mb-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {params.error}
            </p>
          ) : null}

          {params.saved ? (
            <p className="mb-5 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,white)] px-3 py-2 text-sm text-[var(--success)]">
              Perfil atualizado com sucesso.
            </p>
          ) : null}

          <form action={profileAction} className="flex flex-col gap-4">
            <label className="block">
              <span className="label">Nome</span>
              <input
                type="text"
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={user.name}
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Telefone</span>
              <input
                type="tel"
                name="phone"
                required
                minLength={10}
                maxLength={20}
                defaultValue={user.phone}
                className="field"
              />
            </label>

            <label className="block">
              <span className="label">Instagram</span>
              <input
                type="text"
                name="instagram"
                maxLength={100}
                defaultValue={user.instagram ?? ""}
                placeholder="@seuusuario"
                className="field"
              />
            </label>

            <PhotoField defaultValue={user.photoUrl} />

            <button type="submit" className="btn btn-primary mt-2 w-full">
              Salvar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
