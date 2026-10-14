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
  "chartdown": null,
  "meta": { "title": "Open Road", "artists": "ChartDown examples", "tempo": "76", "feel": "Straight, building" },
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
          "tempo": 76,
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
{
  "chartdown": null,
  "meta": { "title": "Open Road", "key": "D" },
  "key": "D",
  "minor": false,
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "D",
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

### 3 Unknown header names are kept

```chartdown
---
capo: 2
---
## A
1
```

```json
{
  "chartdown": null,
  "meta": { "capo": "2" },
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

### 3 If key is missing, C is assumed

```chartdown
## A
1
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

### 3 If meter is missing, 4/4 is assumed

```chartdown
## A
1
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

### 3 The key can use sharps and flats

```chartdown
---
key: F#
---
## A
1
```

```json
{
  "chartdown": null,
  "meta": { "key": "F#" },
  "key": "F#",
  "minor": false,
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "F#",
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

### 3 Adding m to the key makes it minor

```chartdown
---
key: Bbm
---
## A
1m
```

```json
{
  "chartdown": null,
  "meta": { "key": "Bbm" },
  "key": "Bb",
  "minor": true,
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "Bb",
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
                { "type": "chord", "root": "1", "degree": 0, "quality": "m", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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

### 3 The meter is a time signature

```chartdown
---
meter: 12/8
---
## A
1
```

```json
{
  "chartdown": null,
  "meta": { "meter": "12/8" },
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
          "meter": "12/8",
          "tempo": null,
          "bars": [
            {
              "number": 1,
              "beats": 12,
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
                { "type": "chord", "root": "1", "degree": 0, "quality": "", "bass": null, "bassDegree": null, "beats": 12, "push": 0, "hold": false, "stab": false, "fermata": false }
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

### 3 The chartdown field declares the spec version

```chartdown
---
chartdown: 0.4
---
## A
1
```

```json
{
  "chartdown": "0.4",
  "meta": { "chartdown": "0.4" },
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
  "chartdown": "0.7",
  "meta": { "title": "Open Road", "chartdown": "0.7" },
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
  "warnings": [
    { "line": 3 }
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
{
  "chartdown": null,
  "meta": { "title": "Open Road" },
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
  "warnings": [
    { "line": 3 }
  ]
}
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
  "chartdown": null,
  "meta": { "title": "Open Road", "key": "G" },
  "key": "G",
  "minor": false,
  "sections": [
    {
      "name": "Verse",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "G",
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
    { "line": 1 }
  ]
}
```
