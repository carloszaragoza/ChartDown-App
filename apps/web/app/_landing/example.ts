// The landing's demo song: an original chart in ChartDown (no lyrics beyond a short cue). The
// mockups draw it through the parser and the Open standard section shows it as text, so the two
// always match (T-1310).
export const EXAMPLE_CHART = `---
title: Morning Light
key: E
tempo: 72
---
## Verse 1
> MD: Keys pad only. Drums enter on bar 5, light.
1 "Morning comes slow" | 5/7 | 6m | 4
## Chorus 1
> MD: Full band in. Driving bass, open hi-hat.
{mf} 4 | 1/3 | 4 | 6m 5
## Bridge
2m | 4 | 1/3 | 5`;

// The keys the Numbers or Letters card moves through: the chart still works in each.
export const DEMO_KEYS = ["E", "G", "D"] as const;

// Tonight's set in the Sets card: original songs, each in its key.
export const DEMO_SET = [
  { title: "Morning Light", key: "E" },
  { title: "Open Road", key: "G" },
  { title: "Harbor Lights", key: "D" },
] as const;

export const LANGUAGE_URL = "https://github.com/ChartDown/spec";
export const CONTACT = "contact@chartdown.app";
