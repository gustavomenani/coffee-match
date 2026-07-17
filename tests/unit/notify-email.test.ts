import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auditLogMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/observability", () => ({
  logError: (...a: unknown[]) => logErrorMock(...a),
}));

import { sendEmail } from "@/lib/notify";

beforeEach(() => {
  vi.clearAllMocks();
  auditLogMock.mockResolvedValue(undefined);
  // No Resend configured for these tests (empty string is falsy → console/prod path).
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendEmail delivery accounting", () => {
  it("in production, an unconfigured Resend is NOT a delivery — returns false, audits delivered:false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const ok = await sendEmail({
      to: "a@b.com",
      subject: "s",
      text: "t",
      auditAction: "notify.test",
    });
    // Must be false so callers never stamp reminderSentAt/notifiedAt on a mail
    // that never went out.
    expect(ok).toBe(false);
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "notify.test",
        meta: expect.objectContaining({
          delivered: false,
          failure: "email_unconfigured",
        }),
      })
    );
  });

  it("in non-production, the dev console channel still reports delivered:true", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const ok = await sendEmail({
      to: "a@b.com",
      subject: "s",
      text: "t",
      auditAction: "notify.test",
    });
    expect(ok).toBe(true);
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ delivered: true, channel: "console" }),
      })
    );
    info.mockRestore();
  });
});
