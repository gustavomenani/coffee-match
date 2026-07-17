import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionError = { ok: false; error: string };
export type AuthedUser = {
  id: string;
  email: string;
  name: string | null;
  role: "participant" | "admin";
};

/**
 * Always re-loads the user from DB so demoted admins lose access immediately
 * (JWT role alone is not trusted for privileged actions).
 */
export async function requireUser(): Promise<
  { ok: true; user: AuthedUser } | ActionError
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Não autenticado." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function requireAdmin(): Promise<
  | {
      ok: true;
      user: AuthedUser;
      membership: {
        organizationId: string;
        organization: { id: string; slug: string; name: string };
      };
    }
  | ActionError
> {
  const result = await requireUser();
  if (!result.ok) return result;

  if (result.user.role !== "admin") {
    return { ok: false, error: "Acesso negado." };
  }

  // The schema allows a user in several orgs, but the admin surfaces assume a
  // single "home" org. findFirst without an order returned an ARBITRARY org, so
  // a two-org admin could silently act on the wrong tenant across requests.
  // Pin it to the oldest membership so the choice is deterministic and stable.
  // If real multi-org admin is ever needed, this is the one place to thread an
  // explicit orgId through — every admin action derives its scope from here.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: result.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
  });

  if (!membership) {
    return { ok: false, error: "Admin sem organização." };
  }

  return {
    ok: true,
    user: result.user,
    membership: {
      organizationId: membership.organizationId,
      organization: membership.organization,
    },
  };
}

/** Throw-style helper for server pages that prefer exceptions. */
export async function requireAdminOrThrow() {
  const result = await requireAdmin();
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result;
}
