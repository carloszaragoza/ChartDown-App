import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import { opensStand } from "../../lib/shell/prefetch";
import { IntentLink } from "./IntentLink";
import { PageSkeleton } from "./PageSkeleton";
import { PendingPage } from "./PendingPage";
import { StandSkeleton } from "./StandSkeleton";

const prefetch = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch, push: () => undefined }),
  usePathname: () => "/catalog",
}));

const render = (node: React.ReactNode) =>
  renderToString(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );
const skeletons = (html: string) => html.match(/astryx-skeleton/g)?.length ?? 0;

describe("F-003 a tap answers at once, and the side navigation does not prefetch on sight", () => {
  it("F-003 a side navigation link never prefetches on sight", () => {
    const html = render(<IntentLink href="/sets">Sets</IntentLink>);
    expect(html).toContain('href="/sets"');
    expect(prefetch).not.toHaveBeenCalled();
    // It is a Link with Next's own prefetching off.
    const element = IntentLink({ href: "/sets", children: "Sets" });
    expect((element.props as { prefetch?: boolean }).prefetch).toBe(false);
  });

  it("F-003 it prefetches its page on intent: the pointer over it, a touch or keyboard focus", () => {
    const own = vi.fn();
    const element = IntentLink({ href: "/stand", children: "Stand", onFocus: own });
    const props = element.props as Record<string, (event: unknown) => void>;
    props.onPointerEnter?.({});
    props.onTouchStart?.({});
    props.onFocus?.({});
    expect(prefetch).toHaveBeenCalledTimes(3);
    expect(prefetch).toHaveBeenCalledWith("/stand");
    // A handler the caller gives still runs.
    expect(own).toHaveBeenCalledTimes(1);
  });

  it("F-008 a link to stand mode prefetches the whole page on intent, any other only partly", () => {
    prefetch.mockClear();
    const stand = "/sets/1/songs/1/stand";
    const toStand = IntentLink({ href: stand, children: "Start in stand mode" });
    (toStand.props as Record<string, (event: unknown) => void>).onPointerEnter?.({});
    expect(prefetch).toHaveBeenLastCalledWith(stand, { kind: "full" });
    const toSet = IntentLink({ href: "/sets/1", children: "Set" });
    (toSet.props as Record<string, (event: unknown) => void>).onPointerEnter?.({});
    expect(prefetch).toHaveBeenLastCalledWith("/sets/1");
  });

  it("F-008 only stand mode pages count as stand mode", () => {
    for (const href of ["/sets/1/songs/2/stand", "/sets/1/songs/2/stand?s=3", "/versions/9/stand"])
      expect(opensStand(href), href).toBe(true);
    for (const href of ["/stand", "/sets/1", "/sets/1/songs/2", "/versions/9", "/standards"])
      expect(opensStand(href), href).toBe(false);
  });

  it("F-003 a page shows skeletons of its layout while it loads, and says so to screen readers", () => {
    const html = render(<PageSkeleton />);
    expect(skeletons(html)).toBeGreaterThanOrEqual(5);
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading…");
    // The skeletons are shapes, hidden from screen readers; the status is the word.
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it("F-003 stand mode shows its own full-screen skeletons while it loads", () => {
    const html = render(<StandSkeleton />);
    expect(skeletons(html)).toBeGreaterThanOrEqual(7);
    expect(html).toContain('role="status"');
  });

  it("F-003 with no tap pending, the page is shown as it is", () => {
    const html = render(
      <PendingPage>
        <p>The catalog</p>
      </PendingPage>,
    );
    expect(html).toContain("The catalog");
    expect(skeletons(html)).toBe(0);
  });
});
