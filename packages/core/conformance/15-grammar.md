# 15 Grammar

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
  "chartdown": null,
  "meta": { "instruments": "cello" },
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "Bridge",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": true,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": "p",
              "tempoMark": null,
              "nav": [],
              "cues": [
                { "roles": ["cello"], "passes": [], "text": "swell" }
              ],
              "lyric": "Here we go",
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 1, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": true, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": true,
              "times": 2,
              "ending": [1],
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": true, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 },
    { "section": 0, "bar": 1, "pass": 2 }
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
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": [1, 2, 3],
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": [4],
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 }
  ],
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
{
  "chartdown": null,
  "meta": { "instruments": "cello" },
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [
        { "md": true, "roles": ["cello", "bass"], "passes": [], "text": "Together." }
      ],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 }
  ],
  "warnings": []
}
```

### 15 A repeat count only follows :|, so xN elsewhere cannot be read

```chartdown
## A
1 x3 | 4
```

```json
{
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 }
  ],
  "warnings": [
    { "line": 2 }
  ]
}
```

### 15 An ending must open its bar; later in the bar it cannot be read

```chartdown
## A
|: 1 | 4 [1] 5 :|
```

```json
{
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": true,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": true,
              "times": 2,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 },
    { "section": 0, "bar": 1, "pass": 2 },
    { "section": 0, "bar": 2, "pass": 2 }
  ],
  "warnings": [
    { "line": 2 }
  ]
}
```

### 15 Cues, dynamics and landmarks can sit anywhere in a bar

```chartdown
## A
1 {drums: in} 4 "Here we go" {mf} | 5
```

```json
{
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": "mf",
              "tempoMark": null,
              "nav": [],
              "cues": [
                { "roles": ["drums"], "passes": [], "text": "in" }
              ],
              "lyric": "Here we go",
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 }
  ],
  "warnings": []
}
```

### 15 // starts a comment only at the start of a line

```chartdown
## A
// Count it in
1 | 4 // last time
```

```json
{
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 }
  ],
  "warnings": [
    { "line": 3 },
    { "line": 3 },
    { "line": 3 }
  ]
}
```

### 15 Reserved words in braces ignore case, dots and spaces

```chartdown
## A
1 {SEGNO} | 4 {Rit.} | 5 {A Tempo} | 1 {D.S.}
```

```json
{
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": ["segno"],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": "rit",
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 3,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": "atempo",
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 4,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": ["ds"],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 },
    { "section": 0, "bar": 3, "pass": 1 },
    { "section": 0, "bar": 4, "pass": 1 },
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 },
    { "section": 0, "bar": 3, "pass": 1 },
    { "section": 0, "bar": 4, "pass": 1 }
  ],
  "warnings": []
}
```

### 15 Directive names are read in any case, and a value they cannot read is a warning

```chartdown
## A
1
@KEY D
4
@Tempo 90
5
@key H
1
```

```json
{
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        },
        {
          "key": "D",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 2,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        },
        {
          "key": "D",
          "minor": false,
          "meter": "4/4",
          "tempo": 90,
          "bars": [
            {
              "number": 3,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        },
        {
          "key": "D",
          "minor": false,
          "meter": "4/4",
          "tempo": 90,
          "bars": [
            {
              "number": 4,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        }
      ]
    }
  ],
  "playOrder": [
    { "section": 0, "bar": 1, "pass": 1 },
    { "section": 0, "bar": 2, "pass": 1 },
    { "section": 0, "bar": 3, "pass": 1 },
    { "section": 0, "bar": 4, "pass": 1 }
  ],
  "warnings": [
    { "line": 7 }
  ]
}
```
