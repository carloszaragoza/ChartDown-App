import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * ChartDown's Astryx theme (Design Handoff 2.0, section 2): neutral, with larger controls on
 * touch screens so every tap target on an iPad is at least 44 px (principle 5), and a little
 * smaller on a phone held upright (40 px; R-03.9).
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
        // A phone held upright: a little smaller, so the screen holds more than buttons (owner's
        // review, October 15, 2026; R-03.9). Still well above WCAG 2.2's 24 px.
        when: { pointer: "coarse", width: { below: "sm" } },
        value: {
          tokens: {
            "--size-element-sm": "32px",
            "--size-element-md": "40px",
            "--size-element-lg": "44px",
          },
        },
      },
    ],
  },
});
