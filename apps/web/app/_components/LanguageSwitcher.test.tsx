import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { LanguageSwitcher } from "./LanguageSwitcher";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));

const render = (locale: "en" | "es") =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      <LanguageSwitcher />
    </NextIntlClientProvider>,
  );

describe("R-01.5 the language switcher", () => {
  it("R-01.5 English is pressed in English, and Español in Spanish", () => {
    expect(render("en")).toMatch(/aria-pressed="true"[^>]*>EN</);
    expect(render("en")).toMatch(/aria-pressed="false"[^>]*>ES</);
    expect(render("es")).toContain('aria-label="Idioma"');
    expect(render("es")).toMatch(/aria-pressed="true"[^>]*>ES</);
  });

  it("R-01.5 each language button is labelled in its own language", () => {
    expect(render("es")).toContain('aria-label="English"');
    expect(render("en")).toContain('aria-label="Español"');
  });
});
