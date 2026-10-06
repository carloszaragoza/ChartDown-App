import { describe, expect, it } from "vitest";
import { rootCallback } from "./callback";

describe("T-401 a sign-in sent back to the root", () => {
  it("R-01.1 a provider's code that lands on the root finishes signing in at /auth/callback", () => {
    expect(rootCallback({ code: "cb373945-e338" })).toBe(
      "/auth/callback?code=cb373945-e338&next=%2F",
    );
  });

  it("R-01.1 an email link or an error is passed on too, so the person sees why", () => {
    expect(rootCallback({ token_hash: "abc", type: "signup" })).toBe(
      "/auth/callback?token_hash=abc&type=signup&next=%2F",
    );
    expect(rootCallback({ error: "access_denied", error_description: "invite_required" })).toBe(
      "/auth/callback?error=access_denied&error_description=invite_required&next=%2F",
    );
  });

  it("R-01.1 the root opened normally stays the root, and nothing else is carried over", () => {
    expect(rootCallback({})).toBeNull();
    expect(rootCallback({ waitlist: "sent", account: "deleted" })).toBeNull();
    expect(rootCallback({ code: "x", next: "https://evil.example" })).toBe(
      "/auth/callback?code=x&next=%2F",
    );
  });
});
