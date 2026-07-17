import { afterEach, describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "@/lib/security/ip";

const h = (init: Record<string, string>) => new Headers(init);

const originalHops = process.env.TRUSTED_PROXY_HOPS;
afterEach(() => {
  if (originalHops === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = originalHops;
});

describe("clientIpFromHeaders", () => {
  it("reads the client IP behind one proxy", () => {
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7"
    );
  });

  it("ignores a forged entry the client prepended", () => {
    // The client sent "1.2.3.4"; our proxy appended what it really saw.
    // Trusting the leftmost entry would hand every attacker unlimited buckets.
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))
    ).toBe("203.0.113.7");
  });

  it("ignores a whole forged chain", () => {
    expect(
      clientIpFromHeaders(
        h({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.7" })
      )
    ).toBe("203.0.113.7");
  });

  it("cannot be used to burn a victim's bucket", () => {
    // Attacker claims to be the victim; we key on their own address instead.
    const victim = "198.51.100.9";
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": `${victim}, 203.0.113.7` }))
    ).not.toBe(victim);
  });

  it("counts hops from the right with two trusted proxies", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    // client, cdn -> nginx appends the cdn's address
    expect(
      clientIpFromHeaders(
        h({ "x-forwarded-for": "203.0.113.7, 198.51.100.1" })
      )
    ).toBe("203.0.113.7");
  });

  it("clamps instead of falling back to the spoofable leftmost entry", () => {
    process.env.TRUSTED_PROXY_HOPS = "3";
    // Chain shorter than configured: take the leftmost only because it IS the
    // whole chain, never as a blind fallback on a longer forged chain.
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7"
    );
  });

  it("rejects free text so it cannot be used as a key namespace", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "not-an-ip; DROP TABLE" }))
    ).toBe("unknown");
  });

  it("falls back to x-real-ip only when it is an IP", () => {
    expect(clientIpFromHeaders(h({ "x-real-ip": "203.0.113.7" }))).toBe(
      "203.0.113.7"
    );
    expect(clientIpFromHeaders(h({ "x-real-ip": "garbage" }))).toBe("unknown");
  });

  it("handles IPv6", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "2001:db8::1" }))
    ).toBe("2001:db8::1");
  });

  it("rejects an out-of-range IPv4", () => {
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "999.1.1.1" }))).toBe(
      "unknown"
    );
  });

  it("returns unknown with no headers at all", () => {
    expect(clientIpFromHeaders(h({}))).toBe("unknown");
  });

  it("ignores a bogus TRUSTED_PROXY_HOPS instead of misbehaving", () => {
    process.env.TRUSTED_PROXY_HOPS = "abc";
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))
    ).toBe("203.0.113.7");
  });
});
