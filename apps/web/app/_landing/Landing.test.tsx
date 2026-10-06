import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { Landing, type LandingProps } from "./Landing";

vi.mock("./actions", () => ({ joinWaitlist: () => undefined }));
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

describe("T-1201 the landing page", () => {
  it("R-01.8 a visitor joins the waitlist from the landing page", () => {
    const html = render({ signInEnabled: true, waitlistReady: true });
    expect(html).toContain("One song for the whole band. Cues for every player.");
    expect(html).toMatch(/<input[^>]*type="email"[^>]*name="email"/);
    expect(html).toContain("Join the waitlist");
    expect(render({ signInEnabled: true, waitlistReady: true, result: "sent" })).toContain(
      "we will write when there is a place for you",
    );
    expect(render({ signInEnabled: true, waitlistReady: true, result: "invalid" })).toContain(
      "Enter a valid email address.",
    );
  });

  it("R-01.7 sign-in and the invite code show only where sign-in is open", () => {
    const open = render({ signInEnabled: true, waitlistReady: true });
    expect(open).toContain('href="/auth/sign-in"');
    expect(open).toContain('href="/auth/sign-up"');
    expect(open).toContain('href="/catalog"');
    const production = render({ signInEnabled: false, waitlistReady: true });
    expect(production).not.toContain('href="/auth/sign-in"');
    expect(production).not.toContain('href="/auth/sign-up"');
    expect(production).toContain("Join the waitlist");
  });

  it("R-01.8 without a database the waitlist says it is not available yet", () => {
    const html = render({ signInEnabled: false, waitlistReady: false });
    expect(html).not.toMatch(/name="email"/);
    expect(html).toContain("The waitlist is not available yet.");
  });

  it("R-00.1 the hero draws the same ChartDown the language section shows, viewed as drums", () => {
    const html = render({ signInEnabled: false, waitlistReady: true });
    expect(html).toContain("Open it up a little.");
    expect(html).toContain("Light groove, hi-hat.");
    expect(html).toContain("Viewing as Drums");
    expect(html).toContain("{mf} 4 | 1 | 5 | 6m");
    expect(html).toContain('href="https://github.com/ChartDown/Language"');
    expect(html).not.toMatch(/<button[^>]*>[^<]*View as/);
  });

  it("R-01.6 after deleting an account, the landing page says so", () => {
    const html = render({ signInEnabled: true, waitlistReady: true, accountDeleted: true });
    expect(html).toMatch(/role="status"[^>]*>Your account was deleted/);
    expect(render({ signInEnabled: true, waitlistReady: true })).not.toContain(
      "Your account was deleted",
    );
  });

  it("R-01.5 the landing page reads in Spanish", () => {
    const html = render({ signInEnabled: true, waitlistReady: true }, "es");
    expect(html).toContain("Una canción para toda la banda.");
    expect(html).toContain("Unirme a la lista de espera");
    expect(html).toContain("Viendo como Batería");
  });
});
