# 14 Lyrics and rights

### 14 Parsers warn when a landmark is above the 8-word limit

```chartdown
## Verse
1 "one two three four five six seven eight nine ten" | 4
```

```json
{
  "sections": [
    { "rows": [{ "bars": [{ "lyric": "one two three four five six seven eight nine ten" }, {}] }] }
  ],
  "warnings": [{ "line": 2, "code": "landmark-too-long", "values": { "words": 10, "max": 8 } }]
}
```
