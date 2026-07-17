import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyMercadoPagoSignature } from "@/lib/mp-webhook";

describe("verifyMercadoPagoSignature", () => {
  const secret = "test-webhook-secret";
  const dataId = "123456";
  const requestId = "abc-req";
  // MP sends ts as epoch milliseconds. Pin a fixed "now" so the freshness
  // window is deterministic.
  const now = 1_700_000_000_000;
  const ts = String(now);

  function sign(manifest: string) {
    return createHmac("sha256", secret).update(manifest).digest("hex");
  }

  function validSignature(atTs: string = ts) {
    return `ts=${atTs},v1=${sign(`id:${dataId};request-id:${requestId};ts:${atTs};`)}`;
  }

  it("accepts a valid, fresh signature", () => {
    expect(
      verifyMercadoPagoSignature({
        xSignature: validSignature(),
        xRequestId: requestId,
        dataId,
        secret,
        now,
      })
    ).toBe(true);
  });

  it("rejects tampered signature", () => {
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${ts},v1=deadbeef`,
        xRequestId: requestId,
        dataId,
        secret,
        now,
      })
    ).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(
      verifyMercadoPagoSignature({
        xSignature: null,
        xRequestId: requestId,
        dataId,
        secret,
        now,
      })
    ).toBe(false);
  });

  it("rejects a replayed signature older than the freshness window", () => {
    // Correctly signed, but timestamped 10 minutes ago — a captured replay.
    const staleTs = String(now - 10 * 60_000);
    expect(
      verifyMercadoPagoSignature({
        xSignature: validSignature(staleTs),
        xRequestId: requestId,
        dataId,
        secret,
        now,
      })
    ).toBe(false);
  });

  it("rejects a future-dated timestamp", () => {
    const futureTs = String(now + 10 * 60_000);
    expect(
      verifyMercadoPagoSignature({
        xSignature: validSignature(futureTs),
        xRequestId: requestId,
        dataId,
        secret,
        now,
      })
    ).toBe(false);
  });

  it("accepts a signature at the edge of the window", () => {
    const edgeTs = String(now - 4 * 60_000); // within 5 min
    expect(
      verifyMercadoPagoSignature({
        xSignature: validSignature(edgeTs),
        xRequestId: requestId,
        dataId,
        secret,
        now,
      })
    ).toBe(true);
  });

  it("rejects a non-numeric timestamp", () => {
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=notanumber,v1=${sign(
          `id:${dataId};request-id:${requestId};ts:notanumber;`
        )}`,
        xRequestId: requestId,
        dataId,
        secret,
        now,
      })
    ).toBe(false);
  });
});
