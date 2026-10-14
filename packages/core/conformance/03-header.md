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
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "D",
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
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "F#",
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
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "Bb",
          "minor": true,
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
chartdown: 9.9
---
## A
1
```

```json
{
  "chartdown": "9.9",
  "meta": { "title": "Open Road", "chartdown": "9.9" },
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
  "numbering": "1m",
  "sections": [
    {
      "name": "Verse",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "G",
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
    { "line": 1 }
  ]
}
```

### 3 numbering: 6m counts numbers in a minor key from its relative major

```chartdown
---
key: Em
numbering: 6m
---
## A
6m | 1 | 4 | 5 | 37 | 7m7b5/6
```

```json
{
  "chartdown": null,
  "meta": { "key": "Em", "numbering": "6m" },
  "key": "E",
  "minor": true,
  "numbering": "6m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "E",
          "minor": true,
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
                { "type": "chord", "root": "6", "degree": 0, "quality": "m", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
                { "type": "chord", "root": "1", "degree": 3, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
                { "type": "chord", "root": "4", "degree": 8, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
              "nav": [],
              "cues": [],
              "lyric": null,
              "items": [
                { "type": "chord", "root": "5", "degree": 10, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 5,
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
                { "type": "chord", "root": "3", "degree": 7, "quality": "7", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
              ]
            },
            {
              "number": 6,
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
                { "type": "chord", "root": "7", "degree": 2, "quality": "m7b5", "bass": "6", "bassDegree": 0, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
    { "section": 0, "bar": 5, "pass": 1 },
    { "section": 0, "bar": 6, "pass": 1 }
  ],
  "warnings": []
}
```

### 3 numbering: 6m does not change a major key

```chartdown
---
key: G
numbering: 6m
---
## A
1 | 4 | 6m | 5
```

```json
{
  "chartdown": null,
  "meta": { "key": "G", "numbering": "6m" },
  "key": "G",
  "minor": false,
  "numbering": "6m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "G",
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
                { "type": "chord", "root": "6", "degree": 9, "quality": "m", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
    { "section": 0, "bar": 4, "pass": 1 }
  ],
  "warnings": []
}
```

### 3 A numbering other than 1m or 6m is a warning, and 1m is used

```chartdown
---
key: Em
numbering: relative
---
## A
1m | b3
```

```json
{
  "chartdown": null,
  "meta": { "key": "Em", "numbering": "relative" },
  "key": "E",
  "minor": true,
  "numbering": "1m",
  "sections": [
    {
      "name": "A",
      "use": null,
      "notes": [],
      "rows": [
        {
          "key": "E",
          "minor": true,
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
                { "type": "chord", "root": "b3", "degree": 3, "quality": "", "bass": null, "bassDegree": null, "beats": 4, "push": 0, "hold": false, "stab": false, "fermata": false }
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
    { "line": 3 }
  ]
}
```
