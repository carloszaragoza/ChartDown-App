# 12 Numbers and letters

Cases with a `display` block check the chords as shown. `rows` lists every row as "chord chord | chord"; `keys` is the key each row is shown in.

### 12 Transposing a chart in G to A gives the chords in A

```chartdown
---
key: G
---
## A
1 | 4 | 5 | 6m
```

```display
{ "style": "letters", "key": "A" }
```

```json
{ "homeKey": "A", "rows": ["A | D | E | F#m"] }
```

### 12 In a minor key 1 is the tonic: in Em, 1m is Em and b3 is G

```chartdown
---
key: Em
---
## A
1m | b3 | b6 | b7
```

```display
{ "style": "letters" }
```

```json
{ "homeKey": "Em", "rows": ["Em | G | C | D"] }
```

### 12 Letters convert to scale degrees of the current key

```chartdown
---
key: G
---
## A
G | C | D/F# | Em
```

```display
{ "style": "numbers" }
```

```json
{ "rows": ["1 | 4 | 5/7 | 6-"] }
```

### 12 Number display uses - for minor, also in minor sevenths

```chartdown
## A
6m | 2m7 | 1maj7
```

```display
{ "style": "numbers" }
```

```json
{ "rows": ["6- | 2-7 | 1maj7"] }
```

### 12 Letter display uses m for minor

```chartdown
---
key: D
---
## A
6- | 2m
```

```display
{ "style": "letters" }
```

```json
{ "rows": ["Bm | Em"] }
```

### 12 Keys of F, Bb, Eb, Ab, Db and Gb use flat spellings

```chartdown
---
key: F
---
## A
1 | 4 | 5 | b7 | b3
```

```display
{ "style": "letters" }
```

```json
{ "rows": ["F | Bb | C | Eb | Ab"] }
```

### 12 Other keys use sharp spellings

```chartdown
---
key: D
---
## A
1 | 3 | #4 | #5
```

```display
{ "style": "letters" }
```

```json
{ "rows": ["D | F# | G# | A#"] }
```

### 12 Minor keys spell chords like their relative major

```chartdown
---
key: Dm
---
## A
1m | b6 | b7 | 5
```

```display
{ "style": "letters" }
```

```json
{ "rows": ["Dm | Bb | C | A"] }
```

### 12 Letters keep their written spelling when the chart is not transposed

```chartdown
---
key: F
---
## A
A# | Bb
```

```display
{ "style": "letters" }
```

```json
{ "rows": ["A# | Bb"] }
```

### 12 A transposed display moves key changes by the same interval

```chartdown
---
key: G
---
## Chorus
1 | 4
## Last chorus
@key A
1 | 4
```

```display
{ "style": "letters", "key": "A" }
```

```json
{ "homeKey": "A", "keys": ["A", "B"], "rows": ["A | D", "B | E"] }
```

### 12 A transposed key change takes its common name

```chartdown
---
key: C
---
## A
1
@key F
1 | 4
```

```display
{ "style": "letters", "key": "Db" }
```

```json
{ "keys": ["Db", "F#"], "rows": ["Db", "F# | B"] }
```

### 12 Slash basses convert with the same rules

```chartdown
---
key: G
---
## A
1/3 | 5/7
```

```display
{ "style": "letters", "key": "A" }
```

```json
{ "rows": ["A/C# | E/G#"] }
```

### 12 Numbers stay as written in number style, whatever the display key

```chartdown
---
key: G
---
## A
1 | b7 | x | %
```

```display
{ "style": "numbers", "key": "A" }
```

```json
{ "rows": ["1 | b7 | x | %"] }
```

### 12 With numbering: 6m, a minor-key chart shows the same letters as its 1m version

```chartdown
---
key: Em
numbering: 6m
---
## A
6m | 1 | 4 | 3
```

```display
{ "style": "letters" }
```

```json
{ "homeKey": "Em", "keys": ["Em"], "rows": ["Em | G | C | B"] }
```

### 12 With numbering: 6m, letters shown as numbers count from the relative major

```chartdown
---
key: Em
numbering: 6m
---
## A
Em | G | C | B7
```

```display
{ "style": "numbers" }
```

```json
{ "homeKey": "Em", "rows": ["6- | 1 | 4 | 37"] }
```

### 12 Number display uses - for every canonical minor quality

```chartdown
## A
2-7 | 7ø | 1m(maj7) | 6min
```

```display
{ "style": "numbers" }
```

```json
{ "rows": ["2-7 | 7-7b5 | 1-maj7 | 6-"] }
```
