import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
const sent = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
  }),
  headers: async () => ({ get: (name: string) => sent.get(name) ?? null }),
}));
vi.mock("next-intl/server", () => ({ getRequestConfig: (make: unknown) => make }));

const config = async () =>
  ((await import("./request")).default as unknown as () => Promise<{ timeZone: string }>)();

describe("the formatter's time zone (F-014)", () => {
  beforeEach(() => {
    jar.clear();
    sent.clear();
  });
  it("F-014 is the browser's, from its cookie, before the connection's", async () => {
    jar.set("cd_tz", "America/New_York");
    sent.set("x-vercel-ip-timezone", "Europe/Madrid");
    expect((await config()).timeZone).toBe("America/New_York");
  });
  it("F-014 is the connection's before the browser has sent it", async () => {
    sent.set("x-vercel-ip-timezone", "America/Mexico_City");
    expect((await config()).timeZone).toBe("America/Mexico_City");
  });
  it("F-014 is UTC with neither, or with a name no runtime knows", async () => {
    jar.set("cd_tz", "Mars/Olympus");
    expect((await config()).timeZone).toBe("UTC");
  });
});
