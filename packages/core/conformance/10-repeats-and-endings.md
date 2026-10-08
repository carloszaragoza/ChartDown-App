# 10 Repeats and endings

### 10 |: at the start of a row starts a repeat at its first bar

```chartdown
## A
|: 1 | 4
```

```json
{ "sections": [{ "rows": [{ "bars": [{ "repeatStart": true }, {}] }] }], "warnings": [] }
```

### 10 :| at the end of a row ends a repeat that plays twice by default

```chartdown
## A
1 | 4 :|
```

```json
{ "sections": [{ "rows": [{ "bars": [{}, { "repeatEnd": { "times": 2 } }] }] }], "warnings": [] }
```

### 10 :| xN plays the repeated bars N times in total

```chartdown
## A
|: 1 | 4 | 1 | 5 :| x3
```

```json
{
  "sections": [
    { "rows": [{ "bars": [{ "repeatStart": true }, {}, {}, { "repeatEnd": { "times": 3 } }] }] }
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
  "sections": [
    {
      "rows": [
        {
          "bars": [{ "repeatStart": true }, {}, {}, { "ending": [1], "repeatEnd": { "times": 2 } }]
        },
        {
          "bars": [
            {
              "ending": [2],
              "items": [{ "root": "5" }, { "root": "4" }, { "root": "5" }, { "root": "1" }]
            }
          ]
        }
      ]
    }
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
  "sections": [{ "rows": [{ "bars": [{ "ending": [1, 2] }, { "ending": [3] }] }] }],
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
  "sections": [
    {
      "rows": [
        { "bars": [{ "repeatStart": true }, { "repeatEnd": { "times": 3 } }] },
        { "bars": [{ "repeatStart": true }, { "repeatEnd": { "times": 4 } }] }
      ]
    }
  ],
  "warnings": []
}
```
