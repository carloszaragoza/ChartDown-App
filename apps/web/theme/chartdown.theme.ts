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
  adaptations: {
    rules: [
      {
        when: { pointer: "coarse" },
        value: {
          tokens: {
            "--size-element-sm": "36px",
            "--size-element-md": "44px",
            "--size-element-lg": "52px",
          },
          // The heading links home; it doesn't follow the element sizes.
          components: { "side-nav-heading": { base: { minHeight: "44px" } } },
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
