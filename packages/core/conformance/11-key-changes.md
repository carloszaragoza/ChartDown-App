# 11 Key changes

### 11 @key changes the key from the next row onward and marks the change

```chartdown
---
key: D
---
## Last chorus
1 | 4
@key E
1 | 4
5 | 1
```

```json
{
  "sections": [
    {
      "rows": [
        { "key": { "root": "D", "minor": false } },
        { "key": { "root": "E", "minor": false }, "keyChange": { "root": "E", "minor": false } },
        { "key": { "root": "E", "minor": false } }
      ]
    }
  ],
  "warnings": []
}
```

### 11 The new key stays in effect in later sections until the next @key

```chartdown
---
key: G
---
## Bridge
@key A
1
## Tag
4
@key G
1
```

```json
{
  "sections": [
    { "rows": [{ "key": { "root": "A" } }] },
    {
      "rows": [{ "key": { "root": "A" } }, { "key": { "root": "G" }, "keyChange": { "root": "G" } }]
    }
  ]
}
```

### 11 Adding m makes the new key minor

```chartdown
---
key: C
---
## A
@key Am
1m | 4m
```

```json
{
  "sections": [
    {
      "rows": [
        { "key": { "root": "A", "minor": true }, "keyChange": { "root": "A", "minor": true } }
      ]
    }
  ]
}
```

### 11 A key change at the end of a section is marked on the next section's first row

```chartdown
## Bridge
5
@key D
## Last chorus
1
```

```json
{
  "sections": [
    { "rows": [{ "key": { "root": "C" } }] },
    { "rows": [{ "key": { "root": "D" }, "keyChange": { "root": "D" } }] }
  ]
}
```
