"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventFormSchema } from "@/lib/validations/event";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Não autorizado.");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });
  if (!membership) {
    throw new Error("Admin sem organização.");
  }

  return { session, membership };
}

function parseEventForm(formData: FormData) {
  const priceReaisRaw = formData.get("priceReais");
  let priceCents: number;
  if (priceReaisRaw != null && String(priceReaisRaw).length > 0) {
    priceCents = Math.round(Number(priceReaisRaw) * 100);
  } else {
    priceCents = Number(formData.get("priceCents") ?? 0);
  }

  return eventFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    venue: formData.get("venue"),
    address: formData.get("address"),
    city: formData.get("city"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacityMen: formData.get("capacityMen"),
    capacityWomen: formData.get("capacityWomen"),
    priceCents,
    status: formData.get("status"),
  });
}

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const { membership } = await requireAdmin();
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const data = parsed.data;
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, error: "Datas inválidas." };
  }
  if (endsAt <= startsAt) {
    return { ok: false, error: "Término deve ser após o início." };
  }

  const org =
    membership.organization.slug === "speeddate-br"
      ? membership.organization
      : await prisma.organization.findUnique({
          where: { slug: "speeddate-br" },
        });
  if (!org) {
    return { ok: false, error: "Organização speeddate-br não encontrada." };
  }

  const existing = await prisma.event.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    return { ok: false, error: "Slug já em uso." };
  }

  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      title: data.title,
      slug: data.slug,
      venue: data.venue,
      address: data.address,
      city: data.city,
      startsAt,
      endsAt,
      capacityMen: data.capacityMen,
      capacityWomen: data.capacityWomen,
      priceCents: data.priceCents,
      currency: "BRL",
      status: data.status,
      session: {
        create: { status: "not_started" },
      },
    },
  });

  revalidatePath("/eventos");
  revalidatePath("/admin/eventos");
  revalidatePath("/admin");
  return { ok: true, id: event.id };
}

export async function updateEvent(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const data = parsed.data;
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, error: "Datas inválidas." };
  }
  if (endsAt <= startsAt) {
    return { ok: false, error: "Término deve ser após o início." };
  }

  const current = await prisma.event.findUnique({ where: { id } });
  if (!current) {
    return { ok: false, error: "Evento não encontrado." };
  }

  if (data.slug !== current.slug) {
    const clash = await prisma.event.findUnique({
      where: { slug: data.slug },
    });
    if (clash) {
      return { ok: false, error: "Slug já em uso." };
    }
  }

  await prisma.event.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      venue: data.venue,
      address: data.address,
      city: data.city,
      startsAt,
      endsAt,
      capacityMen: data.capacityMen,
      capacityWomen: data.capacityWomen,
      priceCents: data.priceCents,
      status: data.status,
    },
  });

  revalidatePath("/eventos");
  revalidatePath(`/eventos/${data.slug}`);
  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath("/admin");
  return { ok: true, id };
}

export async function listAdminEvents() {
  await requireAdmin();
  return prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      _count: { select: { tickets: true } },
      session: { select: { status: true } },
    },
  });
}

export async function createEventAction(formData: FormData) {
  "use server";
  const result = await createEvent(formData);
  if (!result.ok) {
    redirect(`/admin/eventos/novo?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/admin/eventos/${result.id}`);
}

export async function updateEventAction(id: string, formData: FormData) {
  "use server";
  const result = await updateEvent(id, formData);
  if (!result.ok) {
    redirect(
      `/admin/eventos/${id}?error=${encodeURIComponent(result.error)}`
    );
  }
  redirect(`/admin/eventos/${id}?saved=1`);
}
