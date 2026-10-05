# ChartDown logo

The ChartDown mark: one circle split by the stem of the D. The left half is the C, the right half is the D, and two red dots beside the stem turn it into a repeat sign.

## Files

| Folder | Files | Use |
|---|---|---|
| `svg/` | `chartdown-mark` (light, dark, mono) | The symbol alone |
| `svg/` | `chartdown-logo`, `chartdown-app-logo` (light, dark) | Symbol with the name; text converted to outlines |
| `svg/` | `chartdown-app-icon` (light, dark, maskable) | Square app icon, full bleed: the system rounds the corners |
| `svg/` | `favicon.svg` | Browser tab icon; switches to light ink in dark mode |
| `png/` | Logos at 4x, mark at 512 px | Docs, README files, social |
| `icons/` | `app-icon-1024` … `152`, `apple-touch-icon`, `favicon` 16/32/48 and `.ico` | App stores, iPad home screen, PWA, browsers |

## Colors

- Light: ink `#16212C`, dots `#B8322A`.
- Dark: ink `#E6EDF3`, dots `#FF8478`, on `#0F161D`.
- One color: `chartdown-mark-mono.svg` uses `currentColor`, so it takes the color of the surrounding text.

## Rules

- Keep clear space around the logo of at least half the symbol's height.
- Minimum size: 16 px for the symbol, 96 px wide for the full logo.
- Never stretch, rotate, outline or add shadows. Never change the dots to another color than the red pencil (or the single color in the mono version).
- The name uses Barlow Condensed (SIL Open Font License), already converted to outlines in the SVG files.
