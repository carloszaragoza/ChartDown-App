# ChartDown logo kit

Final logo: concept 3C, One bar (rounded). Two bar lines and four rhythm slashes; the first beat, in red pencil, is the MD's cue.
Start with `guide.pdf` (one page: clear space, minimum sizes, colors, do and don't).

## svg/ and png/  (svg = master, png = transparent; vector PDFs are in the original kit)
- `chartdown-horizontal-*`      symbol + name (default)
- `chartdown-stacked-*`         symbol above name
- `chartdown-symbol-*`          symbol alone
- `chartdown-symbol-small-*`    two-beat symbol for 24 px and below
- `chartdown-app-horizontal-*`, `chartdown-app-stacked-*`   with "App", secondary to the name

Color versions: `color-on-light`, `color-on-dark`, `black`, `white`. All text is converted to outlines.

## icons/  (square, full bleed, no rounded corners; the system rounds them)
- `app-icon-1024.png` (App Store / master), `app-icon.svg`
- `pwa-512.png`, `pwa-192.png`, `pwa-maskable-512.png` (symbol inside the central 80 %)
- `apple-touch-icon-180.png`, `ipad-pro-167.png`, `ipad-152.png`

## favicon/
- `favicon.svg` (follows the browser's light or dark theme), `favicon.ico` (16, 32, 48), `favicon-16/32/48.png`

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
```

## social/
- `avatar-500.png` (GitHub organization and social; works as a circle)
- `open-graph-1200x630.png` (link previews)
- `email-header-600x150.png`

## In the app
`packages/ui` `ChartDownLogo`: symbol, horizontal or stacked; `app` and `mono` options; colors from `--chartdown-ink` and `--chartdown-cue`.

```css
:root { --chartdown-ink: #16212C; --chartdown-cue: #B8322A; }
[data-theme="dark"] { --chartdown-ink: #E6EDF3; --chartdown-cue: #FF8478; }
```

## Colors (Papel y tinta)
| Role | Light | Dark |
|---|---|---|
| Ink | #16212C | #E6EDF3 |
| Red pencil (cue, first slash only) | #B8322A | #FF8478 |
| Paper | #FBFCFD | #17212B |

Fonts: Barlow Condensed (name) and Source Sans 3 (interface), both SIL Open Font License.
The logo is original work; all rights belong to ChartDown.
