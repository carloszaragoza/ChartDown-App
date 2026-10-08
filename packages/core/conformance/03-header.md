# 3 Header

### 3 The header sits between two lines of three dashes, one name: value per line

```chartdown
---
title: Open Road
artists: ChartDown examples
tempo: 76
feel: Straight, building
---
## A
1
```

```json
{
  "header": {
    "title": "Open Road",
    "artists": "ChartDown examples",
    "tempo": "76",
    "feel": "Straight, building"
  },
  "warnings": []
}
```

### 3 Header names are case-insensitive

```chartdown
---
Title: Open Road
KEY: D
---
## A
1
```

```json
{ "header": { "title": "Open Road", "key": "D" }, "key": { "root": "D", "minor": false } }
```

### 3 Unknown header names are kept

```chartdown
---
capo: 2
---
## A
1
```

```json
{ "header": { "capo": "2" }, "warnings": [] }
```

### 3 If key is missing, C is assumed

```chartdown
## A
1
```

```json
{ "key": { "root": "C", "minor": false } }
```

### 3 If meter is missing, 4/4 is assumed

```chartdown
## A
1
```

```json
{ "meter": { "beats": 4, "unit": 4 } }
```

### 3 The key can use sharps and flats

```chartdown
---
key: F#
---
## A
1
```

```json
{ "key": { "root": "F#", "minor": false } }
```

### 3 Adding m to the key makes it minor

```chartdown
---
key: Bbm
---
## A
1m
```

```json
{ "key": { "root": "Bb", "minor": true } }
```

### 3 The meter is a time signature

```chartdown
---
meter: 12/8
---
## A
1
```

```json
{ "meter": { "beats": 12, "unit": 8 } }
```

### 3 The chartdown field declares the spec version

```chartdown
---
chartdown: 0.4
---
## A
1
```

```json
{ "version": "0.4", "warnings": [] }
```

### 3 A version this parser does not read is a warning

```chartdown
---
title: Open Road
chartdown: 0.7
---
## A
1
```

```json
{
  "version": "0.7",
  "warnings": [
    {
      "line": 3,
      "code": "unsupported-version",
      "values": { "version": "0.7", "supported": "0.3–0.6" }
    }
  ]
}
```

### 3 A header line that is not name: value is a warning and is skipped

```chartdown
---
title: Open Road
this is not a header line
---
## A
1
```

```json
{ "header": { "title": "Open Road" }, "warnings": [{ "line": 3, "code": "header-line" }] }
```

### 3 A header without its closing line ends at the first section, with a warning

```chartdown
---
title: Open Road
key: G
## Verse
1 | 4
```

```json
{
  "header": { "title": "Open Road", "key": "G" },
  "sections": [{ "name": "Verse", "rows": [{ "line": 5 }] }],
  "warnings": [{ "line": 1, "code": "header-not-closed" }]
}
```
