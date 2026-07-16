import { describe, it, expect } from "vitest";
import {
  cleanEmail,
  cleanInstagram,
  cleanPhone,
  cleanText,
} from "@/lib/security/sanitize";
import { parseCuid } from "@/lib/security/ids";

describe("sanitize", () => {
  it("cleans email", () => {
    expect(cleanEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("cleans phone", () => {
    expect(cleanPhone("(11) 99999-8888")).toBe("11999998888");
  });

  it("cleans instagram", () => {
    expect(cleanInstagram("@User.Name")).toBe("user.name");
    expect(cleanInstagram("bad name!")).toBe(null);
  });

  it("strips control chars", () => {
    expect(cleanText("oi\u0000x", 10)).toBe("oix");
  });
});

describe("parseCuid", () => {
  it("accepts cuid-like", () => {
    expect(parseCuid("clxyz1234567890abcdef")).toBeTruthy();
  });
  it("rejects junk", () => {
    expect(parseCuid("../etc/passwd")).toBe(null);
    expect(parseCuid("';")).toBe(null);
  });
});
