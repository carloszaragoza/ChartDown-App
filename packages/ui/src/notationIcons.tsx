import type { SVGProps } from "react";

/**
 * The visual editor's notation icons (SPEC-13, R-13.16): a mark of the chart as the chart draws
 * it, on Astryx's 24×24 grid and 1.5 line, as the ChartDown icons (icons.ts). Dots and filled
 * shapes take the `cd-icon-dot` class.
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

/**
 * The visual editor's other actions (R-13.16; owner's decision, October 27, 2026: never generic
 * icons): drawn for ChartDown on the same grid and line, musical where they can be: bar lines for
 * rows and bars, the repeat signs, `#` for the ChartDown text, the waveform for the band's audio.
 */
export const EDITOR_ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  details:
    '<path d="M4 7h2.75M11.25 7H20M4 17h8.75M17.25 17H20"/><circle cx="9" cy="7" r="2.25"/><circle cx="15" cy="17" r="2.25"/>',
  import:
    '<path d="M6 11V3h8l4 4v4"/><path d="M14 3v4h4"/><path d="M4 15v6M20 15v6"/><path d="M12 10v9M9 16l3 3 3-3"/>',
  save: '<path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v4h4"/><path d="m9 14 2.5 2.5L16 12"/>',
  done: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  text: '<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  visual: '<path d="M3 4v10M9 4v10M15 4v5"/><path d="m13 21 1-3.5 5.5-5.5 2.5 2.5-5.5 5.5Z"/>',
  audio: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
  addSection: '<path d="M8 4H4v16h4M16 4h4v16h-4"/><path d="M12 8v8M8 12h8"/>',
  addRow: '<path d="M3 4v6M9 4v6M15 4v6M21 4v6"/><path d="M12 14v6M9 17h6"/>',
  rename: '<path d="M4 20l4-1L19 8l-3-3L5 16Z"/><path d="m14 7 3 3"/>',
  addNote: '<path d="M4 6h16M4 11h10M4 16h6"/><path d="M17 14v6M14 17h6"/>',
  repeatSection:
    '<path d="M4 5v14M6.5 5v14M20 5v14M17.5 5v14"/><circle class="cd-icon-dot" cx="10" cy="10" r="1.15"/><circle class="cd-icon-dot" cx="10" cy="14" r="1.15"/><circle class="cd-icon-dot" cx="14" cy="10" r="1.15"/><circle class="cd-icon-dot" cx="14" cy="14" r="1.15"/>',
  duplicate: '<path d="M8 8h12v12H8Z"/><path d="M16 4H4v12"/>',
  moveUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  moveDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  editOriginal: '<path d="M13 5h6v6M19 5l-8 8"/><path d="M17 14v5H5V7h5"/>',
  delete: '<path d="M4 7h16M10 4h4M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  deleteNote: '<path d="M4 6h10M4 11h7M4 16h5"/><path d="m15 13 5 5M20 13l-5 5"/>',
  insertBefore: '<path d="M14 5v14M20 5v14"/><path d="M7 9v6M4 12h6"/>',
  insertAfter: '<path d="M4 5v14M10 5v14"/><path d="M17 9v6M14 12h6"/>',
  newRow: '<path d="M20 5v6a3 3 0 0 1-3 3H5"/><path d="m9 10-4 4 4 4"/>',
  deleteRow: '<path d="M3 4v6M9 4v6M15 4v6M21 4v6"/><path d="M8 17h8"/>',
  copyBar: '<path d="M9 8h11v12H9Z"/><path d="M13 12v4M16 12v4"/><path d="M5 16V4h11"/>',
  copyRow: '<path d="M3 4v6M9 4v6M15 4v6M21 4v6"/><path d="M10 15h9v6h-9Z"/><path d="M6 18v-5h9"/>',
  paste:
    '<path d="M8 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2"/><path d="M9 3h6v3H9Z"/><path d="M9.5 11v6M14.5 11v6"/>',
  pasteAfter:
    '<path d="M4 5v14M10 5v14"/><path d="M14 8h6v12h-6Z"/><path d="M15.5 6.5h3"/><path d="M17 12v4"/>',
} as const;

export type EditorIconName = keyof typeof EDITOR_ICONS;

/** A dynamic as its icon: its letters, bold and italic, as the chart writes them (pp to ff). */
const dynamicIcon = (letters: string) =>
  `<text x="12" y="16.5" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="${letters.length > 1 ? 11 : 14}" fill="currentColor" stroke="none">${letters}</text>`;

/** A ChartDown drawing as a component, for Astryx's Icon (`<Icon icon={...} />`). */
function drawn(body: string) {
  function ChartDownIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
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
  return ChartDownIcon;
}

/**
 * A notation icon as a component, for Astryx's Icon (`<Icon icon={notationIcon("coda")} />`), or
 * a dynamic's letters (`notationIcon("mf")`).
 */
export function notationIcon(name: NotationIconName | "pp" | "p" | "mp" | "mf" | "f" | "ff") {
  return drawn(
    name in NOTATION_ICONS ? NOTATION_ICONS[name as NotationIconName] : dynamicIcon(name),
  );
}

/** One of the visual editor's actions as a component, for Astryx's Icon. */
export const editorIcon = (name: EditorIconName) => drawn(EDITOR_ICONS[name]);
