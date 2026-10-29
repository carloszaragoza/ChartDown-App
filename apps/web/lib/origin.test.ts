import { describe, expect, it } from "vitest";
import { whatsappLink } from "./origin";

describe("T-3029 a band invitation sent by WhatsApp", () => {
  it("R-04.2 the link holds only the message, for the MD to pick the contact in WhatsApp", () => {
    const message =
      "Carlos invites you to play in LifeStone Church on ChartDown. Sign in: https://chartdown.app/bands";
    const link = new URL(whatsappLink(message));
    expect(link.origin).toBe("https://wa.me");
    // No phone number in the path, and nothing but the text.
    expect(link.pathname).toBe("/");
    expect([...link.searchParams.keys()]).toEqual(["text"]);
    expect(link.searchParams.get("text")).toBe(message);
  });
});
