# Button

Three kinds of button, all at least `target-min` (44px) tall, `radius-md`, `label` text, with an optional Icon beside the text.

- **Primary:** `ink` fill with `ink-inverse` text. One per screen: the main next step (Next, Save).
- **Secondary:** `paper` with a `control-border` outline and `ink` text.
- **View as (instrument selector):** `md` outline and text, with the view-as icon, because it changes which MD notes you see.
- **Icons:** 20px, in the button's text color, 8px from the label. Place them where they point: the previous arrow before the text, the next arrow after it; other icons before the text.
- Focus: a 2px `focus` ring with 2px offset. Never remove it.
- No color-only states: disabled buttons also say why nearby.
