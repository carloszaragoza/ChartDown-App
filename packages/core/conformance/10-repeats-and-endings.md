# 10 Repeats and endings

### 10 |: at the start of a row starts a repeat at its first bar

```chartdown
## A
|: 1 | 4
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
  "warnings": []
}
```

### 10 :| at the end of a row ends a repeat that plays twice by default

```chartdown
## A
1 | 4 :|
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
              "repeatEnd": true,
              "times": 2,
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
    { "section": 0, "bar": 2, "pass": 1 },
    { "section": 0, "bar": 1, "pass": 2 },
    { "section": 0, "bar": 2, "pass": 2 }
  ],
  "warnings": []
}
```

### 10 :| xN plays the repeated bars N times in total

```chartdown
## A
|: 1 | 4 | 1 | 5 :| x3
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
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 4,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": true,
              "times": 3,
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
    { "section": 0, "bar": 2, "pass": 1 },
    { "section": 0, "bar": 3, "pass": 1 },
    { "section": 0, "bar": 4, "pass": 1 },
    { "section": 0, "bar": 1, "pass": 2 },
    { "section": 0, "bar": 2, "pass": 2 },
    { "section": 0, "bar": 3, "pass": 2 },
    { "section": 0, "bar": 4, "pass": 2 },
    { "section": 0, "bar": 1, "pass": 3 },
    { "section": 0, "bar": 2, "pass": 3 },
    { "section": 0, "bar": 3, "pass": 3 },
    { "section": 0, "bar": 4, "pass": 3 }
  ],
  "warnings": []
}
```

### 10 [1] and [2] at the start of a bar are first and second endings

```chartdown
## Bridge
|: 6m | 4 | 1 | [1] 5 :| x2
[2] 5 4 5 1 |
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
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "6", "degree": 9, "quality": "m", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 4,
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
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            }
          ]
        },
        {
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 5,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": false,
              "times": null,
              "ending": [2],
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 1, "push": 0, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 1, "push": 0, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 1, "push": 0, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 1, "push": 0, "hold": false, "stab": false, "fermata": false }
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
    { "section": 0, "bar": 1, "pass": 2 },
    { "section": 0, "bar": 2, "pass": 2 },
    { "section": 0, "bar": 3, "pass": 2 },
    { "section": 0, "bar": 5, "pass": 2 }
  ],
  "warnings": []
}
```

### 10 [1,2] is an ending used on several passes

```chartdown
## A
[1,2] 4 | [3] 5
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
              "ending": [1, 2],
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
              "ending": [3],
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

### 10 :| 3x plays the repeated bars three times in total, as :| x3 does

```chartdown
## Bridge
|: 1 | 4 :| 3x
|: 5 | 6m :| x4
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
              "times": 3,
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
          "key": "C",
          "minor": false,
          "meter": "4/4",
          "tempo": null,
          "bars": [
            {
              "number": 3,
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
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 4,
              "beats": 4,
              "pickup": false,
              "meter": null,
              "repeatStart": false,
              "repeatEnd": true,
              "times": 4,
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "6", "degree": 9, "quality": "m", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
    { "section": 0, "bar": 2, "pass": 2 },
    { "section": 0, "bar": 1, "pass": 3 },
    { "section": 0, "bar": 2, "pass": 3 },
    { "section": 0, "bar": 3, "pass": 1 },
    { "section": 0, "bar": 4, "pass": 1 },
    { "section": 0, "bar": 3, "pass": 2 },
    { "section": 0, "bar": 4, "pass": 2 },
    { "section": 0, "bar": 3, "pass": 3 },
    { "section": 0, "bar": 4, "pass": 3 },
    { "section": 0, "bar": 3, "pass": 4 },
    { "section": 0, "bar": 4, "pass": 4 }
  ],
  "warnings": []
}
```
