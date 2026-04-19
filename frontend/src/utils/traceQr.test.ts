import { describe, expect, it } from "vitest";
import { buildTraceUrl, extractPublicId } from "./traceQr";

describe("traceQr helpers", () => {
  it("extracts public id from plain text", () => {
    expect(extractPublicId("pet-abC123")).toBe("PET-ABC123");
    expect(extractPublicId("  PET-XYZ9  ")).toBe("PET-XYZ9");
  });

  it("extracts public id from trace URL query", () => {
    expect(
      extractPublicId("https://example.com/trace?publicId=pet-abc123")
    ).toBe("PET-ABC123");
  });

  it("extracts public id from URL path", () => {
    expect(extractPublicId("https://example.com/pets/PET-ZZ99/history")).toBe(
      "PET-ZZ99"
    );
  });

  it("returns null for invalid input", () => {
    expect(extractPublicId("")).toBeNull();
    expect(extractPublicId("hello-world")).toBeNull();
    expect(extractPublicId("PET-1")).toBeNull();
  });

  it("builds trace URL from origin and public id", () => {
    expect(buildTraceUrl("https://petid.local", "PET-ABC123")).toBe(
      "https://petid.local/trace?publicId=PET-ABC123"
    );
  });
});

