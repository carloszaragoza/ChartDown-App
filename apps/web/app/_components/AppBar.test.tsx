import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { AppBar, initials, type AppBarProps } from "./AppBar";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const render = (props: AppBarProps, locale: "en" | "es" = "en") =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      <AppBar {...props} />
    </NextIntlClientProvider>,
  );
const signedIn: AppBarProps = {
  account: { name: "Alex Rivera" },
  personalSets: "/bands/p1/sets",
  unread: 0,
};

describe("T-706 the app's top bar", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("R-01.1 a signed-in person gets every section, the language and their account", () => {
    const html = render(signedIn);
    for (const href of ["/sets", "/catalog", "/bands", "/bands/p1/sets", "/profile"])
      expect(html).toContain(`href="${href}"`);
    expect(html).toContain("Sign out");
    expect(html).toContain('aria-label="Account of Alex Rivera"');
    expect(html).toMatch(/>AR</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>English</);
  });

  it("R-01.4 a visitor gets the catalog and Sign in", () => {
    pathname = "/catalog";
    const html = render({ account: null, personalSets: null, unread: 0 }, "es");
    expect(html).toContain('href="/catalog"');
    expect(html).toContain("Iniciar sesión");
    expect(html).not.toContain('href="/bands"');
  });

  it("T-706 the current section is marked, and stand mode has no bar", () => {
    pathname = "/sets/s1";
    expect(render(signedIn)).toMatch(
      /href="\/sets"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/sets"/,
    );
    pathname = "/bands/p1/sets";
    const personal = render(signedIn);
    expect(personal).toMatch(/aria-current="page"[^>]*>Personal space</);
    expect(personal).not.toMatch(/aria-current="page"[^>]*>Bands</);
    pathname = "/sets/s1/songs/1/stand";
    expect(render(signedIn)).toBe("");
    pathname = "/";
    expect(render({ account: null, personalSets: null, unread: 0 })).toBe("");
    expect(render(signedIn)).toContain('href="/sets"');
  });

  it("R-09.3 the notices link says how many are unread, in both languages", () => {
    expect(render(signedIn)).toContain('aria-label="Notices, none unread"');
    const three = render({ ...signedIn, unread: 3 });
    expect(three).toContain('href="/notices"');
    expect(three).toContain('aria-label="Notices, 3 unread"');
    expect(three).toMatch(/aria-hidden="true">3</);
    expect(render({ ...signedIn, unread: 1 }, "es")).toContain('aria-label="Avisos, 1 sin leer"');
    expect(render({ ...signedIn, unread: 120 })).toMatch(/>99\+</);
    expect(render({ account: null, personalSets: null, unread: 0 })).not.toContain(
      'href="/notices"',
    );
  });

  it("T-706 initials for the account button", () => {
    expect(initials("Alex Rivera")).toBe("AR");
    expect(initials("ana")).toBe("A");
    expect(initials("María José de la Peña")).toBe("MP");
  });
});
