# 6 Chords

### 6 A number root is 1 to 7, optionally with b or # in front

```chartdown
## A
1 | b7 | #4 | 7
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "items": [{ "root": "1" }] },
            { "items": [{ "root": "b7" }] },
            { "items": [{ "root": "#4" }] },
            { "items": [{ "root": "7" }] }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 6 A letter root is A to G, optionally with b or # after

```chartdown
## A
G | Bb | F# | E
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "items": [{ "root": "G" }] },
            { "items": [{ "root": "Bb" }] },
            { "items": [{ "root": "F#" }] },
            { "items": [{ "root": "E" }] }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 6 A file may mix numbers and letters

```chartdown
## A
1 | G | 4 | D
```

```json
{ "warnings": [] }
```

### 6 No quality means major

```chartdown
## A
4
```

```json
{ "sections": [{ "rows": [{ "bars": [{ "items": [{ "root": "4", "quality": "" }] }] }] }] }
```

### 6 m or - means minor, and - is normalized to m

```chartdown
## A
6m | 6- | Em
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "items": [{ "quality": "m" }] },
            { "items": [{ "quality": "m" }] },
            { "items": [{ "root": "E", "quality": "m" }] }
          ]
        }
      ]
    }
  ]
}
```

### 6 Qualities are passed through as written

```chartdown
## A
1maj7 | 2m7 | 5sus4 | 4add9 | 1dim | 1aug | 1-7 | 4add11
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "items": [{ "quality": "maj7" }] },
            { "items": [{ "quality": "m7" }] },
            { "items": [{ "quality": "sus4" }] },
            { "items": [{ "quality": "add9" }] },
            { "items": [{ "quality": "dim" }] },
            { "items": [{ "quality": "aug" }] },
            { "items": [{ "quality": "m7" }] },
            { "items": [{ "quality": "add11" }] }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 6 A slash chord names its bass with the same number or letter rules

```chartdown
## A
1/3 | G/B | b7/2 | Bb/D
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "items": [{ "root": "1", "bass": "3" }] },
            { "items": [{ "root": "G", "bass": "B" }] },
            { "items": [{ "root": "b7", "bass": "2" }] },
            { "items": [{ "root": "Bb", "bass": "D" }] }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 6 A root outside 1 to 7 or A to G cannot be read

```chartdown
## A
1 | 8 | H
```

```json
{
  "warnings": [
    { "line": 2, "code": "bad-token", "values": { "token": "8" } },
    { "line": 2, "code": "empty-bar" },
    { "line": 2, "code": "bad-token", "values": { "token": "H" } },
    { "line": 2, "code": "empty-bar" }
  ]
}
```
