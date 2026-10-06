# Design reference

- **`astryx/` – the approved design (version 2, Astryx).** Screens in light and dark, `SCREENS.md` (one section per screen), the prototype and its reference code. It replaces the "Papel y tinta" screens below.
- **`logo/` – the logo kit** (concept 3C, "One bar").
- Exact implementation rules: `specs/entrega-diseno.md`.

## Version 1, "Papel y tinta" (superseded)

Kept as history while the app moves to Astryx; the chart's own conventions (square bar lines, the red pencil for the music director) carry over.

- `screens/` – static HTML exports of the 7 approved screens. Open `screens/index.html` in a browser. They are a visual reference: rebuild them with real components and the tokens, don't copy their inline styles.
- `design-system/tokens.json` – the source of truth for colors (light and dark), typography, spacing, radii, strokes and sizes.
- `design-system/README.md` – brand book: principles, color rules, accessibility results, logo rules.
- `design-system/components/` – each component's rules (README) and a standalone preview.
- Exact implementation rules are in `specs/entrega-diseno.md`.
