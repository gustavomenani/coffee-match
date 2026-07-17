"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { eventFormSchema } from "@/lib/validations/event";
import { requireAdminOrThrow } from "@/lib/authz";
import { auditLog } from "@/lib/audit";
import { bustEventCaches } from "@/lib/cache-bust";
import { parseCuid } from "@/lib/security/ids";
import type { ActionResultWithId as ActionResult } from "@/lib/action-result";

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
  const { membership, user } = await requireAdminOrThrow();
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
    membership.organization.slug === "coffee-match"
      ? membership.organization
      : await prisma.organization.findUnique({
          where: { slug: "coffee-match" },
        });
  if (!org) {
    return { ok: false, error: "Organização Coffee Match não encontrada." };
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

  await auditLog({
    actorId: user.id,
    action: "event.create",
    meta: { eventId: event.id, slug: event.slug },
  });

  bustEventCaches(event.slug);
  revalidatePath("/admin/eventos");
  revalidatePath("/admin");
  return { ok: true, id: event.id };
}

export async function updateEvent(
  rawId: string,
  formData: FormData
): Promise<ActionResult> {
  const { membership, user } = await requireAdminOrThrow();
  const id = parseCuid(rawId);
  if (!id) {
    return { ok: false, error: "Evento inválido." };
  }

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

  const current = await prisma.event.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
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

  await auditLog({
    actorId: user.id,
    action: "event.update",
    meta: { eventId: id, slug: data.slug },
  });

  bustEventCaches(data.slug);
  if (current.slug !== data.slug) bustEventCaches(current.slug);
  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath("/admin");
  return { ok: true, id };
}

// Not exported: "use server" modules may only export async functions.
const ADMIN_EVENTS_PAGE_SIZE = 20;

export async function listAdminEvents(page = 1) {
  const { membership } = await requireAdminOrThrow();
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { startsAt: "desc" },
      skip: (safePage - 1) * ADMIN_EVENTS_PAGE_SIZE,
      take: ADMIN_EVENTS_PAGE_SIZE,
      include: {
        _count: { select: { tickets: true } },
        session: { select: { status: true } },
      },
    }),
    prisma.event.count({
      where: { organizationId: membership.organizationId },
    }),
  ]);
  return {
    events,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_EVENTS_PAGE_SIZE)),
  };
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
