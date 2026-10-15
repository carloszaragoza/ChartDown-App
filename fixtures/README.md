# Example charts

Original example songs from the ChartDown spec, used by the app's tests. The parser keeps its own copies and many more in github.com/ChartDown/parser (`fixtures/`); these two were copied from there when the parser left this repository (T-2103).

| File | Source | License |
| --- | --- | --- |
| `open-road.chartdown` | `examples/` in github.com/ChartDown/spec at `daf07f4` (ChartDown 0.4) | CC0 1.0 |
| `northbound-0.6.chartdown` | `examples/northbound.chartdown` in the same repository at `bd10785` (ChartDown 0.6) | CC0 1.0 |

## Chord sheets to import (`import/`)

Chord sheets of the original example songs, written for the import's tests (SPEC-10, T-1401): chords over a few original lyric lines, as people copy them from the web or a document. They are original songs written for this project and released under CC0 1.0; never add a sheet of a published song here.

| File | What it tests |
| --- | --- |
| `import/morning-light.txt` | A major key with a title, writers, key, tempo and meter; slash chords, `sus4` and `m7`; a chord-only intro with no bar lines; copyright and license lines to skip |
| `import/lantern-bay-minor.txt` | E minor, read tonic-based (`Em` is `1m`, `G` is `b3`, `C` is `b6`, `D` is `b7`); bracketed section headings |
| `import/harbor-lights-bars.txt` | Upper-case headings, `BPM:` and `Time Signature:`, a section marked `(x2)`, chord-only lines with bar lines kept exactly, and a line repeated `x2` |
| `import/*.pdf` | The same three sheets as text PDFs, made with `node scripts/make-import-pdfs.mjs` from `apps/web` (T-1401); each must give the same draft as its `.txt` (R-10.1) |
| `import/scanned-sheet.pdf` | Morning Light drawn as a picture, with no text layer: a scan the importer turns away (R-10.11) |
