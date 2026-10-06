import { existsSync, readFileSync } from "node:fs";
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
    const apple = ["/icons/apple-touch-icon.png", "/icons/ipad-pro-167.png", "/icons/ipad-152.png"];
    for (const icon of [...icons.map((item) => item.src), ...apple])
      expect(existsSync(new URL(`../public${icon}`, import.meta.url)), icon).toBe(true);
  });

  it("T-901 the app's icons are the logo kit's own files (concept 3C, One bar)", () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url));
    const kit = "../../../design/logo/";
    const pairs: [string, string][] = [
      ["../public/icons/app-icon-192.png", "icons/pwa-192.png"],
      ["../public/icons/app-icon-512.png", "icons/pwa-512.png"],
      ["../public/icons/app-icon-maskable-512.png", "icons/pwa-maskable-512.png"],
      ["../public/icons/apple-touch-icon.png", "icons/apple-touch-icon-180.png"],
      ["../public/icons/ipad-152.png", "icons/ipad-152.png"],
      ["../public/icons/ipad-pro-167.png", "icons/ipad-pro-167.png"],
      ["./favicon.ico", "favicon/favicon.ico"],
      ["./icon.svg", "favicon/favicon.svg"],
      ["./opengraph-image.png", "social/open-graph-1200x630.png"],
    ];
    for (const [served, source] of pairs)
      expect(read(served).equals(read(`${kit}${source}`)), served).toBe(true);
  });

  it("T-901 the favicon is the small two-beat symbol and follows the browser's dark theme", () => {
    const svg = readFileSync(new URL("./icon.svg", import.meta.url), "utf8");
    expect(svg.match(/<line /g)).toHaveLength(2);
    expect(svg).toContain("prefers-color-scheme: dark");
    expect(svg).toContain("#B8322A");
  });
});
