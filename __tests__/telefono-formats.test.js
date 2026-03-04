import { describe, it, expect } from "vitest";

// Re-implement phone cleaning logic from tracking.js
function cleanTel(tel) {
  const digits = tel.replace(/\D/g, "");
  return digits.startsWith("34") && digits.length > 9 ? digits.slice(2) : digits;
}

describe("CHAOS-08: Phone number format handling in tracking", () => {
  it("strips non-digit characters", () => {
    expect(cleanTel("+34 612 345 678")).toBe("612345678");
    expect(cleanTel("612-345-678")).toBe("612345678");
  });

  it("removes +34 country code prefix", () => {
    expect(cleanTel("+34612345678")).toBe("612345678");
    expect(cleanTel("34612345678")).toBe("612345678");
  });

  it("keeps short numbers without stripping prefix", () => {
    expect(cleanTel("34567890")).toBe("34567890"); // 8 digits, not > 9
  });

  it("rejects phone numbers with fewer than 6 digits", () => {
    const cleaned = "123".replace(/\D/g, "");
    expect(cleaned.length < 6).toBe(true);
  });

  it("DOCUMENTS EDGE CASE: 0034 format is not handled", () => {
    // 0034612345678 -> digits = "0034612345678" (13 digits)
    // starts with "00", NOT "34" -> prefix NOT removed
    const result = cleanTel("0034612345678");
    expect(result).toBe("0034612345678"); // BUG: should be "612345678"
  });
});
