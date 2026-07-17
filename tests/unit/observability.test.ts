import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, logWarn, logInfo } from "@/lib/observability";

function capture(level: "error" | "warn" | "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  return vi.spyOn(console, method).mockImplementation(() => {});
}

afterEach(() => vi.restoreAllMocks());

describe("observability", () => {
  it("emits one JSON line with a stable event name", () => {
    const spy = capture("error");
    logError("mp_webhook.processing_failed", new Error("boom"), { paymentId: "123" });

    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      level: "error",
      event: "mp_webhook.processing_failed",
      paymentId: "123",
      errorName: "Error",
      errorMessage: "boom",
    });
    expect(typeof parsed.at).toBe("string");
    expect(parsed.stack).toContain("boom");
  });

  it("redacts secret-shaped keys, case-insensitively", () => {
    const spy = capture("warn");
    logWarn("x", {
      token: "abc",
      passwordHash: "$2b$...",
      Authorization: "Bearer xyz",
      email: "ana@example.com", // NOT redacted — needed to debug
    });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.token).toBe("[redacted]");
    expect(parsed.passwordHash).toBe("[redacted]");
    expect(parsed.Authorization).toBe("[redacted]");
    expect(parsed.email).toBe("ana@example.com");
  });

  it("carries the Next digest so a re-thrown RSC error stays identifiable", () => {
    const spy = capture("error");
    const err = Object.assign(new Error("wrapped"), { digest: "DIGEST_123" });
    logError("request.unhandled_error", err);

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.digest).toBe("DIGEST_123");
  });

  it("never throws on an unserializable context", () => {
    const spy = capture("error");
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => logError("x", new Error("y"), cyclic)).not.toThrow();
    // It still emits SOMETHING rather than silently dropping the error.
    expect(spy).toHaveBeenCalled();
  });

  it("handles a non-Error thrown value", () => {
    const spy = capture("info");
    logInfo("note", { detail: "ok" });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({ level: "info", event: "note", detail: "ok" });
  });
});
