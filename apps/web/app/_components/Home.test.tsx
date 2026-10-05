import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { Home } from "./Home";

const render = (locale: "en" | "es") =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      <Home />
    </NextIntlClientProvider>,
  );

describe("R-01.5 the page in each language", () => {
  it("R-01.5 renders in English by default, with English pressed", () => {
    const html = render("en");
    expect(html).toContain(en.home.tagline);
    expect(html).toMatch(/aria-pressed="true"[^>]*>English</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Español</);
  });

  it("R-01.5 switching to Spanish translates the page and presses Español", () => {
    const html = render("es");
    expect(html).toContain(es.home.tagline);
    expect(html).toContain('aria-label="Idioma"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Español</);
    expect(html).not.toContain(en.home.tagline);
  });

  it("R-01.1 offers sign-in, or shows who is signed in with a way to sign out", () => {
    const signedOut = renderToString(
      <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
        <Home signInEnabled />
      </NextIntlClientProvider>,
    );
    expect(signedOut).toContain('href="/auth/sign-in"');
    expect(signedOut).toContain('href="/catalog"');
    const signedIn = renderToString(
      <NextIntlClientProvider locale="es" messages={es} timeZone="UTC">
        <Home signInEnabled account={{ name: "Ana" }} />
      </NextIntlClientProvider>,
    );
    expect(signedIn).toContain("Sesión iniciada como Ana");
    expect(signedIn).toContain("Cerrar sesión");
    expect(signedIn).toContain('href="/versions/new"');
    expect(signedIn).toContain('href="/bands"');
    expect(render("en")).not.toContain("/auth/sign-in");
  });

  it("R-01.5 each language button is labelled in its own language", () => {
    expect(render("es")).toMatch(/lang="en"[^>]*>English</);
    expect(render("en")).toMatch(/lang="es"[^>]*>Español</);
  });
});
