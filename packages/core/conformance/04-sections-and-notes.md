# 4 Sections and notes

### 4 ## starts a section and the name is free text

```chartdown
## Verse 1 (half time)
1
```

```json
{ "sections": [{ "name": "Verse 1 (half time)", "line": 1 }] }
```

### 4 > adds a plain note for everyone

```chartdown
## A
> Watch the stops.
1
```

```json
{
  "sections": [
    { "notes": [{ "md": false, "roles": ["everyone"], "text": "Watch the stops.", "line": 2 }] }
  ]
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
  "sections": [
    {
      "notes": [
        { "md": true, "roles": ["everyone"], "text": "Open it up a little. Don't go all out yet." }
      ]
    }
  ]
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
  "sections": [
    {
      "notes": [
        { "md": true, "roles": ["drums"], "text": "Light groove. Hi-hat or ride, no crashes." },
        { "md": true, "roles": ["bass", "keys"], "text": "Root notes only." }
      ]
    }
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
{ "sections": [{ "notes": [{ "md": true, "text": "Count: one, two, three." }] }] }
```
