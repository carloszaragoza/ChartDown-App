# Handoff Spec: Chart View Controls, Metronome and Stand Mode v2

Repo: `github.com/ChartDown/ChartDown-App` (Next.js + Supabase + Vercel)
Prototype sources (reference only, not production code): `prototypes/`

- `stand-mode-v2.prototype.html`: Stand mode v2, iPad landscape (the portrait version is the same file at 820x1180).
- `chart-view-controls.prototype.html`: chart view header and toolbar.

The prototypes run inside a design canvas and depend on a `support.js` that is not included. Read them for layout, colors, sizes, copy and the interaction logic in the `<script type="text/x-dc">` block. Do not copy their markup into the app; rebuild with the app's existing components (Astryx, Butter theme) and the existing chart renderer.

---

## 0. Terms

| Term | Meaning |
|---|---|
| Section | A chart block: Intro, Verse 1, Vamp, Chorus... |
| Pass superscript | `B1²`, `V4²`: the 2nd (3rd...) time a section is played. Not a variation. |
| Active zone | The top of the Stand mode section stack. The section sitting there is the one being played. |
| NOW | The label shown on the section in the active zone. |

Copy rule: no em dashes in any UI text.

---

## Part A. Chart view: header and toolbar

### A1. Role-based actions
Today a user shown as "Member · No instrument" still sees Edit and Make private. Show actions by role:

| Action | Musician | Music director / admin |
|---|---|---|
| Stand mode (primary, black) | Visible | Visible |
| My notes | Visible | Visible |
| Edit | Hidden | Visible |
| "…" menu: History | Yes | Yes |
| "…" menu: Add the band's audio | No | Yes |
| "…" menu: Make private | No | Yes |

Use the app's existing permission model. If permissions already exist server-side, only the UI changes.

### A2. Header layout
- One left edge for everything: back link, artist line, title, Key/Time/Tempo pills, arrangement line, media buttons.
- Back link: arrow + "Catalog".
- "Play the video" becomes a secondary button: "Watch the video".
- "Add the band's audio" moves into the "…" menu (directors only).
- Action buttons sit on the same row as the title block, wrapping on narrow screens. Min height 48px.

### A3. Toolbar (sticky under the header)
1. **Numbers / Letters** segmented control (unchanged behavior).
2. **Key selector**: label "Key E · original" for the written key, "Key D · transposed" otherwise. The Key pill in the header shows the selected key.
3. **Beat marks** (renamed from "Beats") with an info button that toggles a short help line. Help text: TBD by Carlos (explain Off, Auto, Always).
4. **Add to set**: a single dropdown button. Picking a set adds the song immediately and shows a toast "Added to [set]" with Undo. Last item: "+ New set". Removes the separate "Choose a set" + "Add" pair.

### A4. Section jump pills
- Rename the intro pill "I" to "In" (a lone "I" reads as the I chord in Nashville notation).
- When a song has more than one chorus, the first is "C1" (not "C"). Same rule for any repeated section type.
- Keep pass superscripts (`V4²`). Accessible name: "Verse 4, 2nd time".
- The current/selected section pill is filled (black in chart view).
- Min size 44x48px.

---

## Part B. Metronome control (chart view and Stand mode)

The play icon starts the metronome and the speaker icon opens its settings. Users read them as "play audio", so replace both with one split button:

| Part | Content | Behavior |
|---|---|---|
| Left (main) | Metronome icon + "Click 71" | Tap starts the metronome. While running: label "Stop" + 4 beat dots (beat 1 accented). |
| Right | Sliders icon, `aria-label="Metronome settings"` | Opens the Metronome panel. |

Metronome panel:
- **Tempo**: − / + stepper, 1 BPM steps, range 30 to 240. Helper text: "Same as the chart tempo." or "Chart tempo is 71."
- **Count-in**: Off, 1 bar, 2 bars.
- **Sound**: Click, Wood, Beep.

Count-in and Sound options are proposals. Map them to the metronome's real settings; keep the panel layout.

Idle: neutral button. Running: soft red background (`#FDE8E8`, text `#C93A3A`), same as MD tags.

---

## Part C. Stand mode v2

### C1. Goal
Stand mode currently shows one section and leaves most of the screen empty, so players cannot see what comes next. v2 shows the current section plus everything that follows, stacked vertically. The song moves up like a teleprompter, and focus is shown with color only.

### C2. Layout (top to bottom)
1. **Top bar**: Close · song title + meta line "Key F · 4/4 · Tempo 70.5 · Section 2 of 16" · View button · metronome split button.
2. **Section pills**: one per section, wrapping. Current pill uses the focus color, past pills muted.
3. **Section stack**: a vertical scroll container with all sections in order. The current section sits at the top (active zone), the following sections are below, and past sections are above (dimmed, reachable by scrolling up). Add a bottom spacer (about 70% of viewport height) so the last sections can reach the active zone.
4. **Bottom bar**: Back (64px) · center text "Next up: Vamp" + hint line · Next (64px, primary).

Must work in iPad landscape (1180x820) and portrait (820x1180). In portrait the pills wrap to two rows and more sections fit.

### C3. Section cards
Every card shows its title, bar count, all notes (MD and instrument tags such as Keys and Drums, same tags as chart view), dynamics marks and bars.

- Bars: 4 per row. Sections with fewer than 4 bars use that many columns (a 1-bar Vamp is one wide bar).
- **All cards have identical size and spacing, focused or not.** Focus changes color only. This is critical: size changes would shift the layout while the user scrolls and break active-section detection.

| | Current (NOW) | Upcoming | Past |
|---|---|---|---|
| Background | `#FFFFFF` | transparent | transparent |
| Border | 3px focus color + 5px halo (focus color at ~13% alpha) | 3px transparent + inset 1px `#E4E4E8` | same as upcoming |
| Title / numbers | `#111113` | `#4A4A52` | `#4A4A52` |
| Bar lines | `#111113`, 4px | `#8E8E96`, 4px | `#8E8E96`, 4px |
| Opacity | 1 | 1 | 0.45 |
| Label | "NOW" tag (focus color bg, white text) | none | none |

- Focus color default `#2F6FED`. Make it a theme token so it can change (amber `#E8A317` and green `#16A34A` were also tested). Note that dynamics marks are also blue in the app.
- Transition between states: background, border, shadow, color and opacity over 0.45s ease.

Type sizes (Medium):

| Element | Size |
|---|---|
| Chart numbers | 46px (Small x0.85, Large x1.15) |
| Section title | 22px |
| Notes | 16px; tags 13px |
| Song title | 20px |
| Pills | 16px |

Touch targets are at least 44px everywhere.

### C4. Navigation: vertical scroll with an active zone
1. **User scroll**: the stack uses `scroll-snap-type: y mandatory`; each card `scroll-snap-align: start` with a 6px top margin. When scrolling settles (`scrollend`, or a 120ms debounce), the card whose top is closest to the stack top becomes the current section.
2. **Next / Back / pill tap / tap on a card / keyboard / pedal**: set the current section, then animate the stack so that section's top lands in the active zone.
3. **Animation** (custom, `requestAnimationFrame`, not native smooth scroll):
   - Calm (default): easeInOutCubic, 700ms.
   - Soft bounce: easeOutBack with a small overshoot (c1 = 0.9), 820ms.
   - Disable scroll snap during the animation and restore it about 60ms after. Ignore scroll events while animating.
   - `prefers-reduced-motion: reduce`: jump instantly.
   - Compute the target from `getBoundingClientRect()` relative to the stack, clamped to the max scroll.
4. **Keyboard and pedals**: ArrowDown, ArrowRight and PageDown go next; ArrowUp, ArrowLeft and PageUp go back. Most Bluetooth page-turner pedals send these keys.
5. **End of song**: on the last section, Next becomes "Next song" (go to the next song when Stand mode was opened from a set; otherwise back to the first section).

### C5. Metronome follow
When the metronome runs in Stand mode, the song advances on its own:

1. Start: if count-in is on, the NOW tag reads "COUNT-IN" for the count-in beats.
2. Counting starts at bar 1 of the current section. The card header shows "Bar 3 of 8" in the focus color, and the bar being played gets a soft background (focus color at ~12% alpha, 0.25s transition).
3. When the section's last bar ends, advance to the next section and animate it into the active zone (same animation as C4).
4. After the last section ends, stop the metronome.
5. If the user scrolls, taps or presses Next/Back while it runs, the metronome keeps going and counting restarts at bar 1 of the new section.
6. Bottom hint while running: "Following the metronome. Scroll anytime to jump." When idle: "Scroll up, tap Next or use a pedal".

**Important:** the prototype assumes 4/4 (4 beats per bar). The real implementation must use each section's time signature and each bar's actual beat count from the chart data (split bars, 2/4 bars, time changes).

Use a drift-free timer (audio clock or timestamp-based scheduling), not a plain `setInterval`, so long songs stay in time.

### C6. View panel (button "View")
- **Chart**: Numbers / Letters
- **Beat marks**: Off / Auto / Always (missing from the prototype panel; include it)
- **Coming up**: 1 section / 2 sections / Fill screen (default). Limits how many sections are shown after the current one.
- **Motion**: Calm / Soft bounce
- **Screen**: Light / Stage (dark)
- **Number size**: Small / Medium / Large

Persist these per user (profile setting or local storage). Request full screen automatically when Stand mode opens, where the browser allows it (iPad Safari is limited outside an installed PWA).

### C7. Stage (dark) palette

| Token | Value |
|---|---|
| Background | `#0E0E10` |
| Current card | `#1C1C20` |
| Text / current numbers / lines | `#F4F4F5` |
| Upcoming text | `#B4B4BC` |
| Upcoming lines | `#71717A` |
| Muted | `#A1A1AA` |
| Buttons | `#2A2A2E` |
| MD tag | bg `#3B1D1D`, text `#FF9B9B` |
| Dynamics | `#9CC2FF` |

### C8. Accessibility
- The stack is a list of sections; the current card has `aria-current="step"`. Announce section changes politely (`aria-live="polite"` on a visually hidden "Now: Chorus" line).
- Every icon-only button has an accessible name.
- Reduced motion is respected (C4.3).

---

## Open questions for Carlos
1. Beat marks help text (what Off, Auto and Always show).
2. Real metronome settings, to replace the proposed Count-in and Sound options.
3. Exact roles and permissions (who counts as director).
4. Confirm the pill naming rules (In, C1, pass superscripts).
5. When Stand mode is opened from a set, should "Next song" move through the set automatically?

## Acceptance criteria
- [ ] Musicians do not see Edit, Add the band's audio or Make private.
- [ ] Add to set works in one step, with toast and Undo.
- [ ] Metronome uses the split button and the settings panel; no speaker or play icons without labels.
- [ ] Stand mode shows the current section plus the following ones, with notes, in landscape and portrait.
- [ ] Focus is shown by color only; cards never change size.
- [ ] Scrolling settles a section into the active zone and makes it current.
- [ ] Next, Back, pills, card taps, arrow keys and PageUp/PageDown always bring the section to the top with the selected motion.
- [ ] With the metronome on: count-in, bar highlight, "Bar X of Y", auto-advance, stop at the end, correct for non-4/4 bars.
- [ ] Reduced motion makes every move instant.
- [ ] No em dashes in any new UI text.
