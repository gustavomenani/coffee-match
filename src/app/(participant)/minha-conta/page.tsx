import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function MinhaContaPage() {
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
          <ProfileForm
            defaults={{
              name: user.name,
              phone: user.phone,
              instagram: user.instagram,
              bio: user.bio,
              photoUrl: user.photoUrl,
            }}
          />
        </div>
      </div>
    </main>
  );
}
