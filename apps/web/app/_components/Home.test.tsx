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

  it("R-01.1 shows who is signed in, with the way to a new version", () => {
    const signedIn = renderToString(
      <NextIntlClientProvider locale="es" messages={es} timeZone="UTC">
        <Home signInEnabled account={{ name: "Ana" }} />
      </NextIntlClientProvider>,
    );
    expect(signedIn).toContain("Sesión iniciada como Ana");
    expect(signedIn).toContain('href="/versions/new"');
    // With sign-in, the language lives in the top bar.
    expect(signedIn).not.toContain('aria-label="Idioma"');
  });

  it("R-01.5 each language button is labelled in its own language", () => {
    expect(render("es")).toMatch(/lang="en"[^>]*>English</);
    expect(render("en")).toMatch(/lang="es"[^>]*>Español</);
  });
});
