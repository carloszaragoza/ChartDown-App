# 8 Expression marks

### 8 ' before a chord is a push

```chartdown
## A
1 '4
```

```json
{
  "sections": [
    { "rows": [{ "bars": [{ "items": [{ "push": false }, { "root": "4", "push": true }] }] }] }
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
  "sections": [{ "rows": [{ "bars": [{ "items": [{ "root": "1", "hold": true }] }] }] }],
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
  "sections": [{ "rows": [{ "bars": [{ "items": [{ "stab": true }, { "stab": true }] }] }] }],
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
  "sections": [{ "rows": [{ "bars": [{ "items": [{ "hold": true, "fermata": true }] }] }] }],
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
  "sections": [
    {
      "rows": [
        {
          "bars": [
            {
              "items": [
                {
                  "root": "4",
                  "push": true,
                  "beats": 2,
                  "explicitBeats": true,
                  "stab": true,
                  "hold": false,
                  "fermata": false
                },
                {
                  "root": "5",
                  "push": true,
                  "hold": true,
                  "beats": 2,
                  "fermata": true,
                  "stab": false
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```
