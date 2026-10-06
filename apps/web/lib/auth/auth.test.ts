import { describe, expect, it } from "vitest";
import { authEnabled, waitlistEnabled } from "./enabled";
import { authError } from "./errors";
import { safeNext } from "./redirect";

const configured = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
};

describe("R-01.1 sign-in safety", () => {
  it("R-01.1 a sign-in link only returns to a path inside the app", () => {
    expect(safeNext("/auth/reset-password")).toBe("/auth/reset-password");
    expect(safeNext("/sets/1?x=2")).toBe("/sets/1?x=2");
    for (const outside of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "evil",
      "",
      null,
      undefined,
    ]) {
      expect(safeNext(outside), String(outside)).toBe("/");
    }
  });

  it("R-01.1 sign-in is hidden in production until invite codes exist", () => {
    expect(authEnabled({ ...configured, VERCEL_ENV: "production" })).toBe(false);
    expect(authEnabled({ ...configured, VERCEL_ENV: "preview" })).toBe(true);
    expect(authEnabled({ ...configured })).toBe(true);
    expect(authEnabled({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("T-1203 production opens sign-in only with BETA_OPEN=true, and closes it with any other value", () => {
    const production = { ...configured, VERCEL_ENV: "production" };
    expect(authEnabled({ ...production, BETA_OPEN: "true" })).toBe(true);
    expect(authEnabled({ ...production, BETA_OPEN: "false" })).toBe(false);
    expect(authEnabled({ ...production, BETA_OPEN: "TRUE " })).toBe(false);
    expect(authEnabled({ VERCEL_ENV: "production", BETA_OPEN: "true" })).toBe(false);
  });

  it("R-01.8 the waitlist works in production too, wherever the database is configured", () => {
    expect(waitlistEnabled({ ...configured, VERCEL_ENV: "production" })).toBe(true);
    expect(waitlistEnabled({ ...configured })).toBe(true);
    expect(waitlistEnabled({ VERCEL_ENV: "production" })).toBe(false);
  });

  it("R-01.1 sign-in errors map to messages the interface explains", () => {
    expect(authError({ code: "invalid_credentials" })).toBe("invalid_credentials");
    expect(authError({ code: "over_email_send_rate_limit" })).toBe("rate_limited");
    expect(authError({ status: 429 })).toBe("rate_limited");
    expect(authError({ code: "otp_expired" })).toBe("link_invalid");
    expect(authError({ code: "something_new" })).toBe("unknown");
    expect(authError(null)).toBe("unknown");
    expect(authError({ status: 403, message: "invite_required" })).toBe("invite_required");
  });
});
