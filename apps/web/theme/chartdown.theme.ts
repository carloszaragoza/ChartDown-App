import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * ChartDown's Astryx theme (Design Handoff 2.0, section 2): neutral, with larger controls on
 * touch screens so every tap target on an iPad is at least 44 px (principle 5), and smaller on a
 * phone held upright (32 px, with a smaller page title; R-03.9).
 * Rebuild with `pnpm exec astryx theme build theme/chartdown.theme.ts` after changing it.
 */
export const chartdownTheme = defineTheme({
  name: "chartdown",
  extends: neutralTheme,
  tokens: {
    // One meaning per color (owner's decision, October 27, 2026): the theme's red is Rosewood,
    // the music director's color and the logo's first slash, calmer on a stand than Astryx's red.
    // Errors keep Astryx's own red, so a form's error never reads as an MD note.
    "--color-text-red": ["#94484a", "#e5aba8"],
    "--color-icon-red": ["#94484a", "#e5aba8"],
    "--color-background-red": ["#f6e8e7", "#33201f"],
    "--color-border-red": ["#e5aba8", "#94484a"],
    "--color-error": ["#76000c", "#ffc4be"],
    "--color-error-muted": ["#ffc4be", "#ff98903d"],
    // Density (owner's review on an iPad, October 30, 2026, T-3042): the type and the spacing a
    // tenth under Astryx's neutral, everything but the controls, whose heights (--size-element-*)
    // stay at the touch standard. Each value is neutral's times 0.9.
    "--font-size-4xs": "0.3375rem",
    "--font-size-3xs": "0.3937rem",
    "--font-size-2xs": "0.45rem",
    "--font-size-xs": "0.5625rem",
    "--font-size-sm": "0.675rem",
    "--font-size-base": "0.7875rem",
    "--font-size-lg": "0.9563rem",
    "--font-size-xl": "1.125rem",
    "--font-size-2xl": "1.35rem",
    "--font-size-3xl": "1.6313rem",
    "--font-size-4xl": "1.9688rem",
    "--font-size-5xl": "2.3625rem",
    "--spacing-0-5": "0.1125rem",
    "--spacing-1": "0.225rem",
    "--spacing-1-5": "0.3375rem",
    "--spacing-2": "0.45rem",
    "--spacing-3": "0.675rem",
    "--spacing-4": "0.9rem",
    "--spacing-5": "1.125rem",
    "--spacing-6": "1.35rem",
    "--spacing-7": "1.575rem",
    "--spacing-8": "1.8rem",
    "--spacing-9": "2.025rem",
    "--spacing-10": "2.25rem",
    "--spacing-11": "2.475rem",
    "--spacing-12": "2.7rem",
  },
  components: {
    // A menu shows all its actions when the screen has room (owner's review, October 28, 2026:
    // a section's menu was cut at 300 px, its Delete half hidden); it still never leaves the
    // screen (T-3021).
    "dropdown-menu": {
      base: {
        maxHeight: "calc(100dvb - var(--spacing-4) - var(--spacing-4))",
      },
    },
    button: {
      // Square at least, so a one-letter section in the song form ("I") is a whole touch target
      // (T-2833).
      "size:md": { minWidth: "var(--size-element-md)" },
      // The music director calling the band in: filled in Rosewood, the MD's color, with its
      // word (R-12.2, T-3046). Only Join on a touch screen uses it.
      "variant:director": {
        backgroundColor: "var(--color-icon-red)",
        color: "var(--color-on-accent)",
      },
    },
  },
  adaptations: {
    rules: [
      {
        when: { pointer: "coarse" },
        value: {
          tokens: {
            // A tenth smaller than at first (owner's review, October 21, 2026); medium stays
            // at the 44 px floor.
            "--size-element-sm": "32px",
            "--size-element-md": "44px",
            "--size-element-lg": "47px",
          },
          // The heading links home; it doesn't follow the element sizes. A row (a list's, the
          // account at the foot of the side navigation) is a touch target too, at least as tall as
          // a control, whatever the density does to its text (T-3042).
          components: {
            "side-nav-heading": { base: { minHeight: "44px" } },
            item: { base: { minHeight: "var(--size-element-md)" } },
          },
        },
      },
      {
        // Neutral sets larger type on a touch screen under 1024 px (an iPad upright); the same
        // tenth comes off it (T-3042).
        when: { pointer: "coarse", width: { below: "lg" } },
        value: {
          tokens: {
            "--font-size-4xs": "0.3937rem",
            "--font-size-3xs": "0.45rem",
            "--font-size-2xs": "0.5625rem",
            "--font-size-xs": "0.675rem",
            "--font-size-sm": "0.7875rem",
            "--font-size-base": "0.9rem",
            "--font-size-lg": "1.0688rem",
            "--font-size-xl": "1.2375rem",
            "--font-size-2xl": "1.4625rem",
            "--font-size-3xl": "1.6875rem",
            "--font-size-4xl": "2.025rem",
            "--font-size-5xl": "2.3625rem",
          },
        },
      },
      {
        // A phone held upright: smaller, so the screen holds more than buttons (owner's reviews,
        // October 15 and 21, 2026: about a fifth smaller; R-03.9). Still above WCAG 2.2's 24 px.
        when: { pointer: "coarse", width: { below: "sm" } },
        value: {
          tokens: {
            "--size-element-sm": "28px",
            "--size-element-md": "32px",
            "--size-element-lg": "36px",
            "--text-heading-1-size": "var(--font-size-xl)",
            "--text-heading-2-size": "var(--font-size-lg)",
          },
        },
      },
    ],
  },
});
