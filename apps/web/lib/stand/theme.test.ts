import { afterEach, describe, expect, it, vi } from "vitest";
import {
  rememberStandTheme,
  savedStandTheme,
  STAND_THEME_COOKIE,
  standThemeOf,
  themeOnDevice,
} from "./theme";

describe("T-3031 stand mode's Light or Stage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("R-03.12 a link's theme first, then the one chosen on the device, else the device's", () => {
    expect(standThemeOf("stage", "light")).toBe("stage");
    expect(standThemeOf("light", "stage")).toBe("light");
    expect(standThemeOf(undefined, "stage")).toBe("stage");
    expect(standThemeOf(null, "light")).toBe("light");
    expect(standThemeOf(undefined, undefined)).toBe("device");
    expect(standThemeOf("purple", "nonsense")).toBe("device");
  });

  it("R-03.12 following the device: Stage when it is dark, Light when it isn't", () => {
    expect(themeOnDevice("device", true)).toBe("stage");
    expect(themeOnDevice("device", false)).toBe("light");
    // A choice is kept whatever the device shows.
    expect(themeOnDevice("light", true)).toBe("light");
    expect(themeOnDevice("stage", false)).toBe("stage");
  });

  it("R-03.12 the choice is kept on the device, for a year, and read back", () => {
    const jar = { cookie: "" };
    vi.stubGlobal("document", jar);
    rememberStandTheme("stage");
    expect(jar.cookie).toBe(`${STAND_THEME_COOKIE}=stage; path=/; max-age=31536000; samesite=lax`);
    jar.cookie = `other=1; ${STAND_THEME_COOKIE}=light`;
    expect(savedStandTheme()).toBe("light");
  });
});
