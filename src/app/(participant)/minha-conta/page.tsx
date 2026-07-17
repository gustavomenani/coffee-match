import Link from "next/link";
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
    include: { subscription: { select: { status: true } } },
  });
  if (!user) {
    redirect("/login");
  }
  const isSupporter = user.subscription?.status === "active";

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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isSupporter ? <span className="badge badge-18">☕ Apoiador</span> : null}
          <Link href="/assinatura" className="link-coffee text-sm font-semibold">
            {isSupporter
              ? "Gerenciar assinatura"
              : "Vire apoiador por R$ 10/mês →"}
          </Link>
        </div>

        <div className="surface-card mt-8 p-6 sm:p-8">
          {params.error ? (
            <p className="mb-5 rounded-[var(--radius-sm)] flash-error rounded-[var(--radius-sm)] px-3 py-2 text-sm">
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

            <label className="block">
              <span className="label">Bio da noite (aparece na votação)</span>
              <textarea
                name="bio"
                maxLength={160}
                rows={3}
                defaultValue={user.bio ?? ""}
                placeholder="Ex.: Viciada em café coado e boas conversas."
                className="field"
              />
              <span className="mt-1 block text-xs text-[var(--muted)]">
                Até 160 caracteres — é o seu cartão de visita na cédula.
              </span>
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
