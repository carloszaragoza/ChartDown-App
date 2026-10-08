# 13 Errors

### 13 A token that cannot be read is skipped, warned with its line, and the rest is kept

```chartdown
## A
1 | 4 ? 5 | 1
```

```json
{
  "sections": [{ "rows": [{ "bars": [{}, { "items": [{ "root": "4" }, { "root": "5" }] }, {}] }] }],
  "warnings": [{ "line": 2, "code": "bad-token", "values": { "token": "?" } }]
}
```

### 13 Bars before the first section are skipped with a warning

```chartdown
1 | 4
## Verse
5 | 1
```

```json
{
  "sections": [{ "name": "Verse", "rows": [{ "line": 3 }] }],
  "warnings": [{ "line": 1, "code": "no-section" }]
}
```

### 13 An unknown directive is skipped with a warning

```chartdown
## A
@capo 2
1
```

```json
{
  "sections": [{ "rows": [{ "line": 3 }] }],
  "warnings": [{ "line": 2, "code": "unknown-directive", "values": { "directive": "@capo" } }]
}
```

### 13 A bar with no chords is a warning

```chartdown
## A
1 | {p} | 4
```

```json
{
  "sections": [{ "rows": [{ "bars": [{}, { "items": [], "dynamic": "p" }, {}] }] }],
  "warnings": [{ "line": 2, "code": "empty-bar" }]
}
```

### 13 Every problem is reported with its own line number

```chartdown
---
chartdown: 0.4
---
1
## A
> MD kazoo: Loud.
1 ? | 4
@nope
## B
@use Nowhere
```

```json
{
  "warnings": [
    { "line": 4, "code": "no-section" },
    { "line": 6, "code": "unknown-instrument" },
    { "line": 7, "code": "bad-token" },
    { "line": 8, "code": "unknown-directive" },
    { "line": 10, "code": "use-not-found" }
  ]
}
```
