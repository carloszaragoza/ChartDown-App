# 4 Sections and notes

### 4 ## starts a section and the name is free text

```chartdown
## Verse 1 (half time)
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
      "name": "Verse 1 (half time)",
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

### 4 > adds a plain note for everyone

```chartdown
## A
> Watch the stops.
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
      "notes": [
        { "md": false, "roles": ["everyone"], "passes": [], "text": "Watch the stops." }
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

### 4 > MD: is a music director note for the whole band

```chartdown
## Chorus
> MD: Open it up a little. Don't go all out yet.
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
      "name": "Chorus",
      "use": null,
      "notes": [
        { "md": true, "roles": ["everyone"], "passes": [], "text": "Open it up a little. Don't go all out yet." }
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

### 4 > MD instrument: is a music director note for those players

```chartdown
## Chorus
> MD drums: Light groove. Hi-hat or ride, no crashes.
> MD bass, keys: Root notes only.
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
      "name": "Chorus",
      "use": null,
      "notes": [
        { "md": true, "roles": ["drums"], "passes": [], "text": "Light groove. Hi-hat or ride, no crashes." },
        { "md": true, "roles": ["bass", "keys"], "passes": [], "text": "Root notes only." }
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

### 4 Note text after the first colon is kept as written

```chartdown
## A
> MD: Count: one, two, three.
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
      "notes": [
        { "md": true, "roles": ["everyone"], "passes": [], "text": "Count: one, two, three." }
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
