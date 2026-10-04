import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const tokensCss = read("./tokens.css");
const fontsCss = read("./fonts.css");

/** The custom properties declared directly inside the block that follows `selector`. */
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No block for ${selector}`);
  let depth = 0;
  let end = start;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(css.indexOf("{", start) + 1, end);
  return Object.fromEntries(
    Array.from(body.matchAll(/(--[\w-]+):\s*([^;]+);/g), ([, name, value]) => [
      name,
      value?.trim(),
    ]),
  );
}

const light = block(tokensCss, ":root");
const systemDark = block(tokensCss, ':root:not([data-theme="light"])');
const pinnedDark = block(tokensCss, '[data-theme="dark"]');
const pinnedLight = block(tokensCss, '[data-theme="light"]');
const themes = { light, dark: { ...light, ...pinnedDark } } as const;

// Design Handoff 2.1.
const HANDOFF_COLORS = {
  light: {
    "--ground": "#eef1f4",
    "--paper": "#fbfcfd",
    "--ink": "#16212c",
    "--ink-muted": "#566574",
    "--ink-inverse": "#fbfcfd",
    "--rule": "#b4bec8",
    "--control-border": "#7d8a97",
    "--md": "#b8322a",
    "--dynamic": "#1f4fa8",
  },
  dark: {
    "--ground": "#0f161d",
    "--paper": "#17212b",
    "--ink": "#e6edf3",
    "--ink-muted": "#98a8b8",
    "--ink-inverse": "#0f161d",
    "--rule": "#3a4857",
    "--control-border": "#64748a",
    "--md": "#ff8478",
    "--dynamic": "#86aaff",
  },
};

/** Resolves var(--x) chains to a hex color within one theme. */
function color(theme: Record<string, string>, name: string): string {
  const value = theme[name] ?? "";
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  return ref ? color(theme, ref[1] as string) : value;
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

describe("Handoff 2 tokens", () => {
  it.each(["light", "dark"] as const)(
    "Handoff 2.1 every color token has the Handoff value in the %s theme",
    (name) => {
      for (const [token, value] of Object.entries(HANDOFF_COLORS[name]))
        expect(themes[name][token], token).toBe(value);
      expect(color(themes[name], "--focus")).toBe(HANDOFF_COLORS[name]["--dynamic"]);
    },
  );

  it("the system dark theme and the pinned dark theme are identical", () => {
    expect(systemDark).toEqual(pinnedDark);
  });

  it("the pinned light theme repeats the default light colors exactly", () => {
    expect(pinnedLight).toEqual(
      Object.fromEntries(Object.keys(pinnedLight).map((token) => [token, light[token]])),
    );
    expect(Object.keys(pinnedLight).sort()).toEqual(Object.keys(HANDOFF_COLORS.light).sort());
  });

  it.each(["light", "dark"] as const)(
    "text tokens reach WCAG AA (4.5:1) on paper and ground in the %s theme",
    (name) => {
      const theme = themes[name];
      for (const text of ["--ink", "--ink-muted", "--md", "--dynamic"]) {
        for (const surface of ["--paper", "--ground"]) {
          expect(
            contrast(color(theme, text), color(theme, surface)),
            `${text} on ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(
        contrast(color(theme, "--ink-inverse"), color(theme, "--ink")),
        "ink-inverse on ink",
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(["light", "dark"] as const)(
    "control borders and focus reach 3:1 on paper and ground in the %s theme",
    (name) => {
      const theme = themes[name];
      for (const token of ["--control-border", "--focus"]) {
        for (const surface of ["--paper", "--ground"]) {
          expect(
            contrast(color(theme, token), color(theme, surface)),
            `${token} on ${surface}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    },
  );

  it("Handoff 2.2 typography styles have the Handoff family, size, line height and weight", () => {
    expect(light).toMatchObject({
      "--type-chord-xl": "600 58px/1 var(--font-display)",
      "--type-chord-md": "600 44px/1 var(--font-display)",
      "--type-chord-sm": "600 34px/1 var(--font-display)",
      "--type-song-title": "600 52px/1 var(--font-display)",
      "--type-section-title": "600 36px/1 var(--font-display)",
      "--type-note": "400 18px/1.4 var(--font-text)",
      "--type-label": "600 16px/1.25 var(--font-text)",
      "--type-meta": "400 15px/1.4 var(--font-text)",
      "--type-dynamic-mark": "italic 700 18px/1 var(--font-text)",
      "--type-caption": "400 14px/1.3 var(--font-text)",
      "--type-code": "400 15px/1.6 var(--font-code)",
      "--type-tag": "700 15px/1.5 var(--font-text)",
      "--type-form-chip": "600 22px/1 var(--font-display)",
    });
    expect(light["--font-display"]).toMatch(/^"Barlow Condensed"/);
    expect(light["--font-text"]).toMatch(/^"Source Sans 3"/);
    expect(light["--font-code"]).toMatch(/^"JetBrains Mono"/);
  });

  it("Handoff 2.3 spacing, radii, strokes and sizes have the Handoff values", () => {
    expect(light).toMatchObject({
      "--space-1": "4px",
      "--space-2": "8px",
      "--space-3": "12px",
      "--space-4": "16px",
      "--space-6": "24px",
      "--space-8": "32px",
      "--space-10": "40px",
      "--radius-none": "0",
      "--radius-sm": "4px",
      "--radius-md": "6px",
      "--stroke-bar-line": "3px",
      "--stroke-bar-line-light": "2px",
      "--stroke-emphasis": "1.5px",
      "--stroke-hairline": "1px",
      "--target-min": "44px",
      "--bar-height": "128px",
      "--bar-height-sm": "64px",
    });
  });

  it("themes change colors only, never sizes", () => {
    const sizeTokens = Object.keys(pinnedDark).filter((token) => !(token in HANDOFF_COLORS.dark));
    expect(sizeTokens).toEqual([]);
  });
});

describe("Handoff 2.2 self-hosted fonts", () => {
  const faces = Array.from(fontsCss.matchAll(/@font-face \{([^}]*)\}/g), ([, body = ""]) => ({
    family: /font-family: "([^"]+)"/.exec(body)?.[1],
    style: /font-style: (\w+)/.exec(body)?.[1],
    weight: /font-weight: (\d+)/.exec(body)?.[1],
    url: /url\("([^"]+)"\)/.exec(body)?.[1] ?? "",
  }));

  it("has a font face for every family, weight and style the type styles use", () => {
    expect(faces.map((f) => `${f.family} ${f.style} ${f.weight}`).sort()).toEqual([
      "Barlow Condensed normal 600",
      "JetBrains Mono normal 400",
      "Source Sans 3 italic 700",
      "Source Sans 3 normal 400",
      "Source Sans 3 normal 600",
      "Source Sans 3 normal 700",
    ]);
  });

  it("serves every font from the app, never from Google", () => {
    expect(`${fontsCss}${tokensCss}`).not.toMatch(/fonts\.(googleapis|gstatic)\.com|https?:/);
    for (const face of faces) {
      expect(face.url).toMatch(/^\.\.\/fonts\/[\w-]+\.woff2$/);
      expect(existsSync(new URL(face.url, import.meta.url)), face.url).toBe(true);
    }
  });

  it("ships the open font license of every family", () => {
    for (const family of ["barlowcondensed", "sourcesans3", "jetbrainsmono"]) {
      expect(read(`../fonts/OFL-${family}.txt`)).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
  });
});
