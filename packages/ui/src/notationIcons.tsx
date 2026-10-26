import type { SVGProps } from "react";

/**
 * The visual editor's notation icons (SPEC-13, R-13.16): a mark of the chart as the chart draws
 * it, on the ChartDown icons' 24×24 grid and stroke (icons.ts). The rest of the editor's actions
 * use the interface's Heroicons. Dots and filled shapes take the `cd-icon-dot` class.
 */
export const NOTATION_ICONS = {
  push: '<path d="M11 7 6 12l5 5"/><path d="M17 5v14"/>',
  shortPush: '<path d="M9 7 4.5 12 9 17M14 7l-4.5 5 4.5 5"/><path d="M19 5v14"/>',
  stab: '<path d="m6 16 6-9 6 9"/>',
  fermata:
    '<path d="M4.5 16a7.5 7.5 0 0 1 15 0"/><circle class="cd-icon-dot" cx="12" cy="14.5" r="1.4"/>',
  hold: '<path d="M12 4.5 19.5 12 12 19.5 4.5 12Z"/>',
  repeatStart:
    '<path d="M5 5v14M8.5 5v14"/><circle class="cd-icon-dot" cx="13.5" cy="9.5" r="1.3"/><circle class="cd-icon-dot" cx="13.5" cy="14.5" r="1.3"/>',
  repeatEnd:
    '<path d="M19 5v14M15.5 5v14"/><circle class="cd-icon-dot" cx="10.5" cy="9.5" r="1.3"/><circle class="cd-icon-dot" cx="10.5" cy="14.5" r="1.3"/>',
  ending1: '<path d="M4 19V5h16"/><path d="m10.5 10.5 2.5-2v8.5"/>',
  ending2: '<path d="M4 19V5h16"/><path d="M9.5 10a2.5 2.5 0 1 1 4.2 1.8L9.5 17h5"/>',
  pickup: '<path d="M4 12h5M13 5v14M17 12h3"/><path d="M13 12h1"/>',
  rest: '<path d="M4 9h16"/><rect class="cd-icon-dot" x="8.5" y="9" width="7" height="3.5"/>',
  repeatBar:
    '<path d="M6 18 18 6"/><circle class="cd-icon-dot" cx="7.5" cy="8" r="1.6"/><circle class="cd-icon-dot" cx="16.5" cy="16" r="1.6"/>',
  segno:
    '<path d="M15 7.5c0-1.4-1.3-2.5-3-2.5S9 6.1 9 7.5c0 3.5 6 3.5 6 7 0 1.4-1.3 2.5-3 2.5s-3-1.1-3-2.5"/><path d="M6.5 18.5 17.5 5.5"/><circle class="cd-icon-dot" cx="7" cy="11" r="1.2"/><circle class="cd-icon-dot" cx="17" cy="13" r="1.2"/>',
  coda: '<circle cx="12" cy="12" r="6"/><path d="M12 3v18M3 12h18"/>',
  toCoda:
    '<path d="M2.5 12H9M6.5 9.5 9 12l-2.5 2.5"/><circle cx="16.5" cy="12" r="4"/><path d="M16.5 6v12M11 12h11"/>',
  dsAlCoda:
    '<path d="M20 16H9a4 4 0 0 1 0-8h1"/><path d="m8 5 3 3-3 3"/><circle class="cd-icon-dot" cx="17" cy="8" r="1.2"/><circle class="cd-icon-dot" cx="20" cy="11" r="1.2"/>',
  dcAlFine: '<path d="M4 5v14M7.5 5v14"/><path d="M21 12h-9.5M14.5 9l-3 3 3 3"/>',
  fine: '<path d="M13 5v14"/><rect class="cd-icon-dot" x="16.5" y="5" width="3.5" height="14"/>',
  cresc: '<path d="M20 7 4 12l16 5"/>',
  decresc: '<path d="M4 7l16 5-16 5"/>',
} as const;

export type NotationIconName = keyof typeof NOTATION_ICONS;

/** A dynamic as its icon: its letters, bold and italic, as the chart writes them (pp to ff). */
const dynamicIcon = (letters: string) =>
  `<text x="12" y="16.5" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="${letters.length > 1 ? 11 : 14}" fill="currentColor" stroke="none">${letters}</text>`;

/**
 * A notation icon as a component, for Astryx's Icon (`<Icon icon={notationIcon("coda")} />`), or
 * a dynamic's letters (`notationIcon("mf")`).
 */
export function notationIcon(name: NotationIconName | "pp" | "p" | "mp" | "mf" | "f" | "ff") {
  const body =
    name in NOTATION_ICONS ? NOTATION_ICONS[name as NotationIconName] : dynamicIcon(name);
  function NotationIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
        // The ChartDown icons' class, so dots and filled shapes take the ink (components.css).
        className={["cd-icon", props.className].filter(Boolean).join(" ")}
        // A constant drawing of this package, never text from a person.
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  }
  return NotationIcon;
}
