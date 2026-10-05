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
const signedIn: AppBarProps = { account: { name: "Alex Rivera" }, personalSets: "/bands/p1/sets" };

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
    const html = render({ account: null, personalSets: null }, "es");
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
  });

  it("T-706 initials for the account button", () => {
    expect(initials("Alex Rivera")).toBe("AR");
    expect(initials("ana")).toBe("A");
    expect(initials("María José de la Peña")).toBe("MP");
  });
});
