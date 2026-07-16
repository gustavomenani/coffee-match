import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyMercadoPagoSignature } from "@/lib/mp-webhook";

describe("verifyMercadoPagoSignature", () => {
  const secret = "test-webhook-secret";
  const dataId = "123456";
  const requestId = "abc-req";
  const ts = "1700000000";

  function sign(manifest: string) {
    return createHmac("sha256", secret).update(manifest).digest("hex");
  }

  it("accepts a valid signature", () => {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = sign(manifest);
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: requestId,
        dataId,
        secret,
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
      })
    ).toBe(false);
  });
});
