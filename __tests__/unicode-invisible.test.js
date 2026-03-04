import { describe, it, expect } from "vitest";

describe("CHAOS-07: Unicode invisible chars in client names", () => {
  it("DOCUMENTS BUG: trim does not remove zero-width characters", () => {
    const normalName = "Maria Garcia";
    const whatsappName = "Maria\u200B Garcia"; // zero-width space from WhatsApp

    expect(normalName.trim()).toBe("Maria Garcia");
    expect(whatsappName.trim()).toBe("Maria\u200B Garcia"); // NOT cleaned

    // These would create duplicate clients in Notion
    expect(normalName.trim() === whatsappName.trim()).toBe(false);
  });

  it("proper sanitization strips invisible chars", () => {
    const clean = (s) => s.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

    expect(clean("Maria\u200BGarcia")).toBe("MariaGarcia");
    expect(clean("Maria\u200CGarcia")).toBe("MariaGarcia");
    expect(clean("\uFEFFMaria Garcia")).toBe("Maria Garcia");
    expect(clean("Maria Garcia")).toBe("Maria Garcia");
  });
});
