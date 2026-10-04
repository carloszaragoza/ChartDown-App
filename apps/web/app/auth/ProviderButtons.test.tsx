import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { ProviderButtons } from "./ProviderButtons";

const render = (locale: "en" | "es", providers: ("google" | "azure" | "apple")[], next?: string) =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      <ProviderButtons providers={providers} {...(next ? { next } : {})} />
    </NextIntlClientProvider>,
  );

describe("R-01.1 continue with a provider", () => {
  it("R-01.1 shows one button per enabled provider, in the interface language", () => {
    const html = render("es", ["google", "azure"]);
    expect(html).toContain("Continuar con Google");
    expect(html).toContain("Continuar con Microsoft");
    expect(html).not.toContain("Apple");
    expect(html.match(/name="provider"/g)).toHaveLength(2);
  });

  it("R-01.1 carries where to return after signing in", () => {
    expect(render("en", ["google"], "/sets/1")).toContain('name="next" value="/sets/1"');
  });

  it("R-01.1 shows nothing when no provider is enabled", () => {
    expect(render("en", [])).toBe("");
  });
});
