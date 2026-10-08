import { describe, expect, it } from "vitest";
import { pickLocale } from "./locales";

describe("R-01.5 the first language a visitor sees", () => {
  it("R-01.5 a Spanish browser opens in Spanish, from any region", () => {
    expect(pickLocale("es")).toBe("es");
    expect(pickLocale("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
  });

  it("R-01.5 an English browser, or one with no supported language, opens in English", () => {
    expect(pickLocale("en-US,en;q=0.9")).toBe("en");
    expect(pickLocale("fr-FR,fr;q=0.9")).toBe("en");
    expect(pickLocale("")).toBe("en");
    expect(pickLocale(null)).toBe("en");
  });

  it("R-01.5 the language the browser ranks highest wins", () => {
    expect(pickLocale("en;q=0.5,es;q=0.9")).toBe("es");
    expect(pickLocale("es;q=0.4,en;q=0.8")).toBe("en");
    expect(pickLocale("es;q=0,en")).toBe("en");
  });
});
