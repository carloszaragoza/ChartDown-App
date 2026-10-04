import { describe, expect, it } from "vitest";
import { isProvider, PROVIDER_NAMES, providersFromSettings } from "./providers";

describe("R-01.1 sign-in providers", () => {
  it("R-01.1 offers only the providers enabled in Supabase, Google first", () => {
    const settings = {
      external: { email: true, apple: true, google: true, azure: false, github: true },
    };
    expect(providersFromSettings(settings)).toEqual(["google", "apple"]);
  });

  it("R-01.1 offers none when the settings cannot be read", () => {
    expect(providersFromSettings(null)).toEqual([]);
    expect(providersFromSettings({})).toEqual([]);
  });

  it("R-01.1 accepts only Google, Microsoft and Apple", () => {
    expect(["google", "azure", "apple"].every(isProvider)).toBe(true);
    for (const other of ["github", "email", "", undefined]) expect(isProvider(other)).toBe(false);
    expect(PROVIDER_NAMES.azure).toBe("Microsoft");
  });
});
