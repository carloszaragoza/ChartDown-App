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
  "chartdown": null,
  "meta": { "instruments": "cello" },
  "key": "C",
  "minor": false,
  "sections": [
    {
      "name": "Bridge",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
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
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "C",
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
