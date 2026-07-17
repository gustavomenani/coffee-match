import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUserMock = vi.fn();
const upsertMock = vi.fn();
const auditLogMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { pushSubscription: { upsert: (...a: unknown[]) => upsertMock(...a) } },
}));
vi.mock("@/lib/authz", () => ({
  requireUser: (...a: unknown[]) => requireUserMock(...a),
}));
vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/push", () => ({ getVapidPublicKeyFromEnv: () => null }));

import { savePushSubscription } from "@/lib/actions/push";

const keys = { p256dh: "x".repeat(20), auth: "y".repeat(20) };

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({
    ok: true,
    user: { id: "ckuser000000000000000001" },
  });
  upsertMock.mockResolvedValue({});
  auditLogMock.mockResolvedValue(undefined);
});

describe("savePushSubscription endpoint allowlist (SSRF guard)", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://web.push.apple.com/QABC",
    "https://abc.notify.windows.com/w/?token=x",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
  ])("accepts a real push-service endpoint: %s", async (endpoint) => {
    const res = await savePushSubscription({ endpoint, keys });
    expect(res.ok).toBe(true);
    expect(upsertMock).toHaveBeenCalled();
  });

  it.each([
    "https://10.0.0.10:9200/_cat/indices", // internal host — the SSRF target
    "http://fcm.googleapis.com/fcm/send/x", // not https
    "https://evil.example.com/collect", // arbitrary public host
    "https://fcm.googleapis.com.evil.com/x", // suffix-spoof attempt
    "https://169.254.169.254/latest/meta-data/", // cloud metadata
  ])("rejects a non-push-service endpoint: %s", async (endpoint) => {
    const res = await savePushSubscription({ endpoint, keys });
    expect(res.ok).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
