# Section

A section of a song as a card: its name, its length, the MD notes for this player, and its rows of bars.

- Card: `paper` on `ground`, `hairline` outline in `rule`, `radius-sm`, padding `space-6`.
- Header: name in `section-title`, bar count in `meta` and `ink-muted`.
- MD notes (MDNote) come before the bars, so players read the direction before they play.
- Rows of Bars follow, one source row per screen row.
- In atril mode only the current section is a full card; the next one appears below as a quiet preview (`chord-sm`, `ink-muted`, `bar-height-sm`).
