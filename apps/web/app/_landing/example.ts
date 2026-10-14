// The landing page's example: one section of an original chart, in ChartDown (no lyrics). The
// sheet draws it and the language section shows it as text, so the two always match (T-1201).
export const EXAMPLE_CHART = `---
title: Open Road
key: G
tempo: 76
---
## Chorus
> MD: Open it up a little.
> MD drums: Light groove, hi-hat.
> MD keys: Pad underneath the vocal.
> MD bass: Walk up into the 6.
{mf} 4 | 1 | 5 | 6m`;

// Which bar each instrument's note points at on the sheet (the red pen's circle).
export const NOTE_BARS: Record<string, number> = { drums: 2, keys: 1, bass: 4 };

export const LANGUAGE_URL = "https://github.com/ChartDown/spec";
