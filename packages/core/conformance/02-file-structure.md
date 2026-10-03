# 2 File structure

### 2 A file can have no header, only sections

```chartdown
## Verse
1 | 4
```

```json
{ "header": {}, "sections": [{ "name": "Verse" }], "warnings": [] }
```

### 2 A header comes first, then one or more sections

```chartdown
---
title: Open Road
---

## Intro
1
## Verse
4
```

```json
{
  "header": { "title": "Open Road" },
  "sections": [{ "name": "Intro" }, { "name": "Verse" }],
  "warnings": []
}
```

### 2 Sections stay in play order, and a section played twice is written twice

```chartdown
## Verse
1
## Chorus
4
## Verse
1
```

```json
{ "sections": [{ "name": "Verse" }, { "name": "Chorus" }, { "name": "Verse" }] }
```

### 2 Blank lines are ignored

```chartdown

## Verse

1 | 4

5 | 1

```

```json
{ "sections": [{ "rows": [{ "line": 4 }, { "line": 6 }] }], "warnings": [] }
```

### 2 A line beginning with // is a comment and is not rendered

```chartdown
// Arranged for the Sunday band.
## Verse
// Watch the push in bar 2.
1 | 4
```

```json
{ "sections": [{ "notes": [], "rows": [{ "line": 4 }] }], "warnings": [] }
```
