# ChartDown Layers – format draft 0.5

**Version:** draft 0.5 · **Date:** October 4, 2026 · **Status:** approved for the app (T-105, R-00.2); a candidate for the ChartDown Language repository, where spec 0.4 lists layers on its roadmap.

A **layer** is a separate set of music director (MD) notes that sits on top of a chart without changing it (SDD Plan decision 4). Many bands can use the same public version, each with its own layer. This document defines the layer's data, its text form, and how a layer is placed on a chart.

## 1. Anchors

Every layer note is anchored to:

- **a section**, by its **name** and its **occurrence**: occurrence 1 is the first section with that name in the chart, occurrence 2 the second, and so on (R-00.2, "by name and position");
- optionally, **a bar** of that section, counted from 1 across the section's rows in the order they are written. Repeats are not expanded.

Names match ignoring case and leading or trailing spaces, and nothing looser.

A note also has its **roles**: everyone, or one or more instruments, resolved like chart notes (ChartDown 0.4, section 4.1, with the Admin's catalog, R-00.1). And it has its **text**, a single line.

## 2. Placing a layer on a chart

Each note lands on the section and bar its anchor names. A note whose anchor cannot be found is **unplaced**, with a reason:

| Reason | When |
|---|---|
| `section` | No section has that name, or the chart has fewer sections with that name than the occurrence |
| `bar` | The section exists but has fewer bars than the note's bar |

There is **no guessing**: a note is never moved to a section or bar that only looks similar. An unplaced note is **never lost or changed**. It keeps its text, roles and anchor, so the MD can anchor it again. Placing a layer never changes the chart or the layer.

## 3. Text form

A layer file uses ChartDown syntax for headers, sections and notes:

```
---
chartdown: 0.5
layer: Open Road
---
## Chorus
> MD: Bigger than the record.
> MD bass: Walk up in the last bar.

## Chorus
> MD drums: Crash on 1.

## Bridge
### Bar 3
> MD keys: Pad swell.
```

- **Header** (optional): `chartdown: 0.5` declares the format version, `layer:` gives a title, and `instruments:` declares custom instruments as in charts. Unknown fields are kept.
- `## Name` anchors the notes under it to a section. **A repeated heading means the next occurrence:** the second `## Chorus` in the file is the second Chorus of the chart. To reach only a later occurrence, write the earlier headings empty.
- `### Bar N` anchors the notes under it to bar N (a whole number from 1) of the current section, until the next heading. Notes before any `### Bar` belong to the section itself.
- **Notes:** `> MD: text` and `> text` are for everyone; `> MD bass, keys: text` is for those instruments. All layer notes are MD notes.
- Blank lines and lines starting with `//` are ignored.

### Errors

As in ChartDown 0.4 (section 13), a reader never stops. It skips what it cannot read and warns with the line number:

- a note before the first section;
- a `### Bar` heading without a whole number from 1; its notes then belong to the section;
- any other line, such as bars or directives, which a layer does not contain;
- an unknown instrument; the note is then for everyone;
- a `chartdown` version other than 0.5.

### Writing a layer

A writer groups notes by section name, then by occurrence, and adds the empty headings needed to reach later occurrences. Within a section it writes the section's own notes first, then the `### Bar` groups in bar order. Writing a layer and reading it back gives the same notes.
