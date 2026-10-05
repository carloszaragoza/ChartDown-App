import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("T-901 the installable app", () => {
  it("T-901 the manifest opens ChartDown full screen, in the Papel colors", () => {
    expect(manifest()).toMatchObject({
      name: "ChartDown",
      short_name: "ChartDown",
      start_url: "/",
      display: "standalone",
      background_color: "#fbfcfd",
    });
  });

  it("T-901 every icon is served by the app itself", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((icon) => icon.purpose)).toEqual(["any", "any", "maskable"]);
    for (const icon of [...icons.map((item) => item.src), "/icons/apple-touch-icon.png"])
      expect(existsSync(new URL(`../public${icon}`, import.meta.url)), icon).toBe(true);
  });
});
