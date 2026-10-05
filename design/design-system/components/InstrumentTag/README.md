# InstrumentTag

The red-pencil label that says which instrument an MD note or cue is for, with the instrument's icon beside its name.

- **Tag (default):** icon (16px) + name, outline and text in `md`, `radius-sm`, 15px bold. Use it in MD notes and cues.
- **Compact (icon only):** a `target-min` square with the icon (22px) in `md`. Only where space is tight: a set's lineup, the "View as" menu, a musician list. Always with the instrument name in `aria-label` and a tooltip.
- Instruments are told apart by **name and shape**, never by color: every tag uses `md`. A color per instrument would compete with the chart and fail for color-blind players.
- Icons: drums, bass (bass clef), keys, guitar, vocals (microphone), saxophone, trumpet, trombone, violin. They are ChartDown's own drawings (see Icon). New instruments from the Admin's catalog get an icon before they ship; until then, the tag shows the name only.
- Inside a tag, the icon takes the tag's `md` color. This is the one place an icon is not drawn in `ink`.
