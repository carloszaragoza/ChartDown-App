# 7 Special bars and rests

### 7 x is no chord

```chartdown
## A
x | 1 x
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            { "items": [{ "type": "no-chord" }] },
            { "items": [{ "root": "1" }, { "type": "no-chord" }] }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 7 % repeats the previous bar

```chartdown
## A
1 4 | %
```

```json
{
  "sections": [{ "rows": [{ "bars": [{}, { "items": [{ "type": "repeat-bar" }] }] }] }],
  "warnings": []
}
```

### 7 = continues the previous chord across the barline

```chartdown
## A
<1> | =
```

```json
{ "sections": [{ "rows": [{ "bars": [{}, { "items": [{ "type": "tie" }] }] }] }], "warnings": [] }
```
