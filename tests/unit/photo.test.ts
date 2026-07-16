import { describe, it, expect } from "vitest";
import { sanitizePhotoInput } from "@/lib/security/photo";

describe("sanitizePhotoInput", () => {
  it("allows empty", () => {
    expect(sanitizePhotoInput("")).toEqual({ ok: true, value: null });
  });

  it("allows https url", () => {
    const r = sanitizePhotoInput("https://cdn.example.com/a.jpg");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toContain("https://");
  });

  it("blocks http", () => {
    expect(sanitizePhotoInput("http://evil.com/x.jpg").ok).toBe(false);
  });

  it("allows small jpeg data url", () => {
    const raw = "data:image/jpeg;base64," + "a".repeat(100);
    expect(sanitizePhotoInput(raw).ok).toBe(true);
  });

  it("blocks oversized data url", () => {
    const raw = "data:image/jpeg;base64," + "a".repeat(200_000);
    expect(sanitizePhotoInput(raw).ok).toBe(false);
  });

  it("blocks gif data url", () => {
    expect(sanitizePhotoInput("data:image/gif;base64,aaaa").ok).toBe(false);
  });
});
