import { describe, expect, it, vi } from "vitest";
import { AppLink } from "./AppLink";
import { IntentLink } from "./IntentLink";

vi.mock("next/navigation", () => ({ useRouter: () => ({ prefetch: () => undefined }) }));

describe("F-005 Astryx links move inside the app", () => {
  it("F-005 a page of the app gets the router's link, prefetched on intent", () => {
    expect(AppLink({ href: "/sets?when=past", children: "Past" }).type).toBe(IntentLink);
  });

  it("F-005 the offline reader, a new tab and a download keep a plain anchor", () => {
    expect(AppLink({ href: "/offline/set/1", children: "Open" }).type).toBe("a");
    expect(AppLink({ href: "/sets", target: "_blank", children: "Sets" }).type).toBe("a");
    expect(AppLink({ href: "/sets/1.pdf", download: true, children: "PDF" }).type).toBe("a");
  });
});
