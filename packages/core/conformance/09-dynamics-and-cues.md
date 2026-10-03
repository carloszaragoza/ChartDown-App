# 9 Dynamics and cues

### 9 Dynamics in braces attach to their bar

```chartdown
## A
{pp} 1 | {p} 1 | {mp} 1 | {mf} 1 | {f} 1 | {ff} 1 | {cresc} 1 | {decresc} 1
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "dynamic": "pp" },
            { "dynamic": "p" },
            { "dynamic": "mp" },
            { "dynamic": "mf" },
            { "dynamic": "f" },
            { "dynamic": "ff" },
            { "dynamic": "cresc" },
            { "dynamic": "decresc" }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 9 Any other text in braces is a cue for everyone

```chartdown
## A
1 {watch me} | 4
```

```json
{
  "sections": [
    {
      "rows": [
        { "bars": [{ "cues": [{ "roles": ["everyone"], "text": "watch me" }] }, { "cues": [] }] }
      ]
    }
  ],
  "warnings": []
}
```

### 9 instrument: text in braces is a cue for those players

```chartdown
## A
{p} 1 {drums: in} | 4 | 5 {bass, keys: walk up} | 1
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "dynamic": "p", "cues": [{ "roles": ["drums"], "text": "in" }] },
            {},
            { "cues": [{ "roles": ["bass", "keys"], "text": "walk up" }] },
            {}
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 9 A quoted string is a lyric landmark on its bar

```chartdown
## A
{mf} 6m 5 4 1 "Take the open road" | 6m 5 4 1
```

```json
{
  "sections": [{ "rows": [{ "bars": [{ "lyric": "Take the open road", "dynamic": "mf" }, {}] }] }],
  "warnings": []
}
```

### 9 A landmark of 8 words is fine

```chartdown
## A
1 "one two three four five six seven eight"
```

```json
{ "warnings": [] }
```

### 9 A landmark longer than 8 words is a warning

```chartdown
## A
1 "one two three four five six seven eight nine"
```

```json
{ "warnings": [{ "line": 2, "code": "landmark-too-long" }] }
```
