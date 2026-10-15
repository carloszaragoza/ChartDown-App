import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { Landing, type LandingProps } from "./Landing";
import { readWaitlist } from "./waitlist";

vi.mock("./actions", () => ({ joinWaitlist: async () => ({ status: "sent" }) }));
vi.mock("../actions", () => ({ setLocale: () => undefined }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: () => undefined }),
}));

const render = (props: LandingProps, locale: "en" | "es" = "en") =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es} timeZone="UTC">
      <Landing {...props} />
    </NextIntlClientProvider>,
  );
const open = { signInEnabled: true, waitlistReady: true };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("T-1310 the landing page, version 3", () => {
  it("R-01.8 the hero and the final panel each join the waitlist, the final one with a role", () => {
    const html = render(open);
    expect(html).toContain("Every night.");
    expect(html.match(/<input[^>]*type="email"[^>]*name="email"/g)).toHaveLength(2);
    expect(html).toContain('name="source" value="hero"');
    expect(html).toContain('name="source" value="final_cta"');
    expect(html.match(/name="role"/g)).toHaveLength(3);
    expect(html).toMatch(/checked="" value="music_director"/);
    expect(html).toContain('href="#waitlist"');
    // Links from the ChartDown spec point at #invite.
    expect(html).toContain('id="invite"');
  });

  it("R-01.8 a hidden field turns bots away, and the email is checked before the database", () => {
    expect(
      readWaitlist(form({ email: " Ana@Band.COM ", source: "final_cta", role: "teacher" })),
    ).toEqual({
      status: "ok",
      email: "ana@band.com",
      role: "teacher",
      source: "final_cta",
      bot: false,
    });
    expect(readWaitlist(form({ email: "ana@band.com", role: "roadie" }))).toMatchObject({
      role: null,
      source: "hero",
    });
    expect(readWaitlist(form({ email: "ana@band.com", website: "spam.example" }))).toMatchObject({
      bot: true,
    });
    expect(readWaitlist(form({ email: "not an email" }))).toEqual({ status: "invalid" });
    expect(readWaitlist(form({ email: `${"a".repeat(250)}@b.co` }))).toEqual({ status: "invalid" });
  });

  it("T-1310 the landing is always light: it pins the light tokens", () => {
    expect(render(open)).toContain('data-theme="light"');
  });

  it("R-01.7 sign-in and the invite code show only where sign-in is open", () => {
    const html = render(open);
    expect(html).toContain('href="/auth/sign-in"');
    expect(html).toContain('href="/auth/sign-up"');
    const production = render({ signInEnabled: false, waitlistReady: true });
    expect(production).not.toContain('href="/auth/sign-in"');
    expect(production).not.toContain('href="/auth/sign-up"');
    expect(production).toContain("Save my spot");
  });

  it("R-01.8 without a database the waitlist says it is not available yet", () => {
    const html = render({ signInEnabled: false, waitlistReady: false });
    expect(html).not.toMatch(/name="email"/);
    expect(html).toContain("The waitlist is not available yet.");
  });

  it("R-00.1 the mockups and the Open standard section show the same ChartDown, from the parser", () => {
    const html = render(open);
    expect(html).toContain("Keys pad only. Drums enter on bar 5, light.");
    expect(html).toContain("Morning comes slow");
    expect(html).toContain("{mf} 4 | 1/3 | 4 | 6m 5");
    expect(html).toContain('href="https://github.com/ChartDown/spec"');
    expect(html).not.toContain("ChartDown/Language");
  });

  it("T-1310 the copy has no em dash and promises nothing past the beta, in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      const html = render(open, locale);
      expect(html).not.toContain("—");
      expect(html).not.toMatch(/free forever|always free|after the beta|subscription/i);
      expect(html).not.toMatch(/gratis para siempre|siempre gratis|después de la beta|suscripci/i);
    }
  });

  it("T-1310 the mockups are pictures of the app: labeled, with no controls in them", () => {
    const html = render(open);
    expect(html).toContain('role="img" aria-label="ChartDown chart view preview"');
    const window = html.slice(html.indexOf('aria-label="ChartDown chart view preview"'));
    expect(window.slice(0, window.indexOf("</section>"))).not.toMatch(/<button|<a |tabindex="0"/);
  });

  it("R-01.6 after deleting an account, the landing page says so", () => {
    expect(render({ ...open, accountDeleted: true })).toMatch(
      /role="status"[^>]*>Your account was deleted/,
    );
    expect(render(open)).not.toContain("Your account was deleted");
  });

  it("R-01.5 the landing page reads in Spanish", () => {
    const html = render(open, "es");
    expect(html).toContain("Cada noche.");
    expect(html).toContain("Guardar mi lugar");
    expect(html).toContain("Director musical");
  });
});
