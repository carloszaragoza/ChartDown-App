# 8 Expression marks

### 8 ' before a chord is a push

```chartdown
## A
1 '4
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
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 1, "hold": false, "stab": false, "fermata": false }
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

### 8 < > around a chord is a hold

```chartdown
## A
<1>
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
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": true, "stab": false, "fermata": false }
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

### 8 ! after a chord is a stab

```chartdown
## A
1! 5!
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
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": true, "fermata": false },
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": true, "fermata": false }
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

### 8 ~ after a chord is a fermata

```chartdown
## A
<1>~
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
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": true, "stab": false, "fermata": true }
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

### 8 Marks combine in the order push, hold, chord, beats, stab and fermata

```chartdown
## A
'4:2! '<5>:2~
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
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 1, "hold": false, "stab": true, "fermata": false },
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 1, "hold": true, "stab": false, "fermata": true }
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

### 8 '' before a chord is a short push, a sixteenth note ahead

```chartdown
## Intro
''4:2 5:2 | '1
```

```json
{
  "chartdown": null,
  "meta": {},
  "key": "C",
  "minor": false,
  "sections": [
    {
      "name": "Intro",
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
              "ending": null,
              "dynamic": null,
              "tempoMark": null,
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "4", "degree": 5, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 2, "hold": false, "stab": false, "fermata": false },
                { "type": "chord", "root": "5", "degree": 7, "quality": "", "bass": null, "bassDegree": null, "beats": 2, "push": 0, "hold": false, "stab": false, "fermata": false }
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
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 1, "hold": false, "stab": false, "fermata": false }
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
