import { defineTheme } from "@astryxdesign/core/theme";
import { chartdownTheme } from "./chartdown";

/**
 * Stand mode's theme (Design Handoff 2.0, 1.5): ChartDown's, with bigger large controls on touch
 * screens, since stand mode is played live. Its section and turn buttons use the large size,
 * 56 px on touch; its other controls use the medium one, 44 px.
 * Rebuild with `pnpm exec astryx theme build theme/stand.theme.ts` after changing it.
 */
export const chartdownStandTheme = defineTheme({
  name: "chartdown-stand",
  extends: chartdownTheme,
  components: {
    button: {
      "size:lg": {
        // Square at least: a one-letter section ("I") is as easy to hit as "B1".
        minWidth: "var(--size-element-lg)",
        fontSize: "var(--font-size-xl)",
        fontWeight: "var(--font-weight-bold)",
      },
    },
  },
  adaptations: {
    rules: [
      {
        when: { pointer: "coarse" },
        value: { tokens: { "--size-element-lg": "56px" } },
      },
    ],
  },
});
