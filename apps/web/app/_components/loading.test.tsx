import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import { IntentLink } from "./IntentLink";
import { PageSkeleton } from "./PageSkeleton";
import { ShellHiddenContext } from "./shellContext";
import { StandSkeleton } from "./StandSkeleton";

const prefetch = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ prefetch, push: () => undefined }) }));

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

  it("F-003 a page shows skeletons of its layout while it loads, and says so to screen readers", () => {
    const html = render(<PageSkeleton />);
    expect(skeletons(html)).toBeGreaterThanOrEqual(5);
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading…");
    // The skeletons are shapes, hidden from screen readers; the status is the word.
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it("F-003 a page without the side navigation shows its own skeletons, not the app's", () => {
    const html = render(
      <ShellHiddenContext.Provider value={true}>
        <PageSkeleton />
      </ShellHiddenContext.Provider>,
    );
    expect(skeletons(html)).toBeGreaterThanOrEqual(4);
    expect(html).toContain("Loading…");
  });

  it("F-003 stand mode shows its own full-screen skeletons while it loads", () => {
    const html = render(<StandSkeleton />);
    expect(skeletons(html)).toBeGreaterThanOrEqual(7);
    expect(html).toContain('role="status"');
  });
});
