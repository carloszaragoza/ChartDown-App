// ChartDown's icon set, copied from the "ChartDown – Papel y tinta" design system (Icon).
// 24×24 grid, drawn with the current text color; see components.css. Do not redraw: icons.test.tsx
// checks these against the design system's own preview (fixtures/design-system-icon-preview.html).

export const ACTION_ICONS = {
  previous: '<path d="M15 5 8 12l7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  "view-as":
    '<path d="M2 12c3-5.5 17-5.5 20 0-3 5.5-17 5.5-20 0Z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  atril: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  edit: '<path d="M4 20l4-1L19 8l-3-3L5 16Z"/><path d="m14 7 3 3"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M6 12v8h12v-8"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle class="cd-icon-knob" cx="9" cy="7" r="2.25"/><circle class="cd-icon-knob" cx="15" cy="17" r="2.25"/>',
  setlist:
    '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
} as const;

/** Instrument icons, keyed by the instrument id of the catalog (R-00.1). */
export const INSTRUMENT_ICONS = {
  drums:
    '<path d="M5 9v7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V9"/><ellipse cx="12" cy="9" rx="7" ry="2.5"/><path d="M9.5 7 5.5 3M14.5 7l4-4"/>',
  bass: '<path d="M5 19c6-2 10-6 10-11a5 5 0 0 0-10 0c0 1.7 1.3 3 3 3"/><circle class="cd-icon-dot" cx="19" cy="7" r="1.2"/><circle class="cd-icon-dot" cx="19" cy="12" r="1.2"/>',
  keys: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M9 13v6M15 13v6"/><rect class="cd-icon-dot" x="7.5" y="5" width="3" height="8"/><rect class="cd-icon-dot" x="13.5" y="5" width="3" height="8"/>',
  guitar:
    '<circle cx="9" cy="15" r="5"/><circle cx="9" cy="15" r="1.5"/><path d="m12.5 11.5 7-7M18 3l3 3"/>',
  vocals:
    '<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
  saxophone:
    '<path d="M18.5 3 17 4.5M17 4.5 9.5 15a3.5 3.5 0 0 0 6 3.6l1.6-2.6"/><circle class="cd-icon-dot" cx="12.2" cy="11.3" r="1"/><circle class="cd-icon-dot" cx="14" cy="8.8" r="1"/>',
  trumpet:
    '<path d="M3 12h12M15 12l6-3.5v7Z"/><path d="M6 12v3h7v-3M8 8.5V12M10.5 8.5V12M13 8.5V12"/>',
  trombone: '<path d="M7 9h11M7 15h11M18 9a3 3 0 0 1 0 6M10 9v6M7 9 2.5 6.5v5Z"/>',
  violin:
    '<ellipse cx="9.5" cy="15" rx="4.5" ry="5.5" transform="rotate(-40 9.5 15)"/><path d="m12.5 12 7-7.5"/><circle cx="20.3" cy="3.8" r="1"/><path d="M3 5.5 17.5 21"/>',
} as const;

/**
 * Icons the approved screens add (design/screens/, Design Handoff 3): drawn on the same grid and
 * stroke; components.test.tsx checks each against the screens.
 */
export const SCREEN_ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  fork: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 12v5"/>',
  public:
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
  private: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/><path d="M12 8v4l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
} as const;

export const ICONS = { ...ACTION_ICONS, ...INSTRUMENT_ICONS, ...SCREEN_ICONS } as const;
export type IconName = keyof typeof ICONS;
export type InstrumentIconName = keyof typeof INSTRUMENT_ICONS;

export function hasInstrumentIcon(instrument: string): instrument is InstrumentIconName {
  return Object.hasOwn(INSTRUMENT_ICONS, instrument);
}
