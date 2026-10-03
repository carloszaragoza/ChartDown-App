# 15 Grammar (informal)

### 15 A row can combine repeats, endings, cues, landmarks and marked chords

```chartdown
---
instruments: cello
---
## Bridge
|: {p} '1:2 <4>:2 "Here we go" {cello: swell} | [1] 5! :| x2
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            {
              "repeatStart": true,
              "dynamic": "p",
              "lyric": "Here we go",
              "cues": [{ "roles": ["cello"], "text": "swell" }],
              "items": [
                { "root": "1", "push": true, "beats": 2 },
                { "root": "4", "hold": true, "beats": 2 }
              ]
            },
            { "ending": [1], "repeatEnd": { "times": 2 }, "items": [{ "root": "5", "stab": true }] }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 15 An ending can be a range of passes

```chartdown
## A
[1-3] 4 | [4] 5
```

```json
{
  "sections": [{ "rows": [{ "bars": [{ "ending": [1, 2, 3] }, { "ending": [4] }] }] }],
  "warnings": []
}
```

### 15 A note's roles can be standard roles or declared ids

```chartdown
---
instruments: cello
---
## A
> MD cello & bass: Together.
1
```

```json
{ "sections": [{ "notes": [{ "roles": ["cello", "bass"] }] }], "warnings": [] }
```
