# ChartDown Layers – format draft 0.5

**Version:** draft 0.5 · **Date:** October 4, 2026 · **Status:** approved for the app (T-105, R-00.2); a candidate for the ChartDown Language repository, where spec 0.4 lists layers on its roadmap.

A **layer** is a separate set of music director (MD) notes that sits on top of a chart without changing it (SDD Plan decision 4). Many bands can use the same public version, each with its own layer. This document defines the layer's data, its text form, and how a layer is placed on a chart.

## 1. Anchors

Every layer note is anchored to:

- **a section**, by its **name** and its **occurrence**: occurrence 1 is the first section with that name in the chart, occurrence 2 the second, and so on (R-00.2, "by name and position");
- optionally, **a bar** of that section, counted from 1 across the section's rows in the order they are written. Repeats are not expanded. A pickup bar is bar 0 of its section and cannot be anchored; the first full bar is bar 1, as in the chart (ChartDown 0.6, spec 5.3).

Names match ignoring case and leading or trailing spaces, and nothing looser.

In the app, a note also records the **revision it was anchored to** (Technical Plan 4, `layer_notes`). The text form does not carry it.

A note also has its **roles**: everyone, or one or more instruments, resolved like chart notes (ChartDown 0.4, section 4.1, with the Admin's catalog, R-00.1). It may be **for one pass** of a repeat, or several (`passes`, for example 2, or 1 and 3), as chart notes are (ChartDown 0.6, spec 9.1): the pass says when, the roles say who, and a note for one pass is as private to its instruments as any other (R-06.4). And it has its **text**, a single line.

## 2. Placing a layer on a chart

Each note lands on the section and bar its anchor names. A note whose anchor cannot be found is **unplaced**, with a reason:

| Reason    | When                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| `section` | No section has that name, or the chart has fewer sections with that name than the occurrence |
| `bar`     | The section exists but has fewer bars than the note's bar                                    |

**Occurrences can shift.** Renaming, adding or removing a section with the same name changes which section is the first, second… with that name. So when the revision a note was anchored to is known, a note is placed only if the chart still has **the same number of sections with that name** as that revision. Otherwise the note is unplaced (reason `section`), even if a section with that name and occurrence exists, and the MD anchors it again. For example, renaming the first of two Choruses flags every Chorus note instead of moving the first Chorus's notes onto the second. Adding a third Chorus also flags them: cautious, but never wrong. A note without a known revision, such as one read from the text form, is placed by name and occurrence alone.

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
- **Notes:** `> MD: text` and `> text` are for everyone; `> MD bass, keys: text` is for those instruments; `> MD 2x: text` and `> MD 2x bass: text` are for the second pass of a repeat, and `> MD 1x,3x bass: text` for the first and third. All layer notes are MD notes.
- Blank lines and lines starting with `//` are ignored.

### Errors

As in ChartDown 0.4 (section 13), a reader never stops. It skips what it cannot read and warns with the line number:

- a note before the first section;
- a `### Bar` heading without a whole number from 1; its notes then belong to the section;
- any other line, such as bars or directives, which a layer does not contain;
- an unknown instrument; the note is then for everyone;
- a `chartdown` version other than 0.5.

### Writing a layer

A writer groups notes by section name, then by occurrence, and adds the empty headings needed to reach later occurrences. Within a section it writes the section's own notes first, then the `### Bar` groups in bar order. Writing a layer and reading it back gives the same notes, without the app's note ids and anchored revisions, which the text form does not carry.
