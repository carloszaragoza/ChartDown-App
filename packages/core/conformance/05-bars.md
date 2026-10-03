# 5 Bars

### 5 Any other line in a section is a row of bars separated by |

```chartdown
## A
1 | 4 | 5 | 1
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "line": 2,
          "bars": [
            { "items": [{ "root": "1" }] },
            { "items": [{ "root": "4" }] },
            { "items": [{ "root": "5" }] },
            { "items": [{ "root": "1" }] }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

### 5 The leading and trailing | are optional

```chartdown
## A
| 1 | 4 |
1 | 4
```

```json
{ "sections": [{ "rows": [{ "bars": [{}, {}] }, { "bars": [{}, {}] }] }], "warnings": [] }
```

### 5 Each line is one printed row of the chart

```chartdown
## A
1 | 4 | 5 | 1
6m | 4 | 5 | 5
```

```json
{ "sections": [{ "rows": [{ "line": 2 }, { "line": 3 }] }] }
```
